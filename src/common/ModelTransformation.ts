import { None, Option, Some } from "oxide.ts";

//@ts-ignore
import type from "webgme";

import engineModule from "./engine/index"; // TODO: add the types?

let enginePromise;
function getEngine() {
  if (!enginePromise) {
    enginePromise = engineModule.create();
  }
  return enginePromise;
}

export default class Transformation {
  private core: GmeClasses.Core;
  private steps: TransformationStep[];

  constructor(core: GmeClasses.Core, steps: TransformationStep[]) {
    this.core = core;
    this.steps = steps;
    // TODO: We may want to create an interface to use with the core (like Umesh mentioned a while ago) so
    // this can create WJI or GME nodes. Technically, WJI can be imported but this has decent perf overhead.
    // First, we should just see if we can optimize WJI
  }

  // FIXME: should we add a different method for apply?
  async apply(nodeOrContext: Core.Node | GMEContext): Promise<JsonNode[]> {
    const context = nodeOrContext instanceof GMEContext
      ? nodeOrContext
      : await GMEContext.fromNode(this.core, nodeOrContext);

    const createdNodes: CreatedNodeDict = {};
    const newNodes = await this.steps.reduce(async (refDataP, step) => {
      const refData = await refDataP;
      const matchOutputs = await step.apply(context, createdNodes);
      return refData.concat(...matchOutputs);
    }, Promise.resolve([]));

    return this._toTree(newNodes);
  }

  _toTree(nodes: JsonNode[]): JsonNode[] {
    const [roots, children] = partition(nodes, (node) => !node.parent);
    children.forEach((child) => {
      child.parent.children.push(child);
      delete child.parent;
    });
    return roots;
  }

  static async fromNode(core: GmeClasses.Core, node: Core.Node) {
    const stepNodes = sortNodeList(core, await core.loadChildren(node), "next");
    const steps = await Promise.all(
      stepNodes.map((step) => TransformationStep.fromNode(core, step)),
    );
    return new Transformation(core, steps);
  }
}

function sortNodeList(core: GmeClasses.Core, nodes: Core.Node[], ptr: string) {
  const nodeDict = Object.fromEntries(
    nodes.map((n) => [core.getPath(n), n]),
  );
  const start = nodes.find((node) => {
    const nodePath = core.getPath(node);
    const predecessor = nodes.find((p) =>
      core.getPointerPath(p, ptr) === nodePath
    );
    return !predecessor;
  });

  const list = [];
  let node = start;
  while (node) {
    if (list.includes(node)) {
      throw new Error("Transformation steps have a cycle!");
    }
    list.push(node);
    const nextPath = core.getPointerPath(node, ptr);
    node = nodeDict[nextPath];
  }

  return list;
}

class TransformationStep {
  private name: string;
  private pattern: Pattern;
  private outputPattern: Pattern;
  private context: GMEContext;

  constructor(
    name: string,
    pattern: Pattern,
    outputPattern: Pattern,
  ) {
    this.name = name;
    this.pattern = pattern;
    this.pattern.ensureCanMatch();
    this.outputPattern = outputPattern;
    this.context = this.pattern.context.union(this.outputPattern.context);
  }

  async apply(
    context: GMEContext,
    createdNodes: CreatedNodeDict = {},
  ) {
    console.log("---> applying step", this.name);
    const matches = await this.pattern.matches(context);
    const combinedContext = context.union(this.context);
    const outputs = await Promise.all(matches.map(
      (match, index) =>
        this.outputPattern.instantiate(
          combinedContext,
          match,
          createdNodes,
          index.toString(),
        ),
    ));
    return outputs;
  }

  static async fromNode(core: GmeClasses.Core, node: Core.Node) {
    const children = await core.loadChildren(node);
    const inputNode = children.find((child) =>
      core.getAttribute(child, "name").toString().includes("Input")
    );
    const outputNode = children.find((child) =>
      core.getAttribute(child, "name").toString().includes("Output")
    );
    const [inputPattern, outputPattern] = await Promise.all([
      Pattern.fromNode(core, inputNode),
      Pattern.fromNode(core, outputNode),
    ]);

    const name = core.getAttribute(node, "name").toString();
    return new TransformationStep(name, inputPattern, outputPattern);
  }
}

type NodePath = string;
export class Pattern {
  private graph: Graph;
  context: GMEContext;
  private externalRelations: any[];
  private nodePaths: { [key: number]: NodePath };

  constructor(context: GMEContext) {
    this.graph = new Graph();
    this.externalRelations = [];
    this.nodePaths = {};
    this.context = context;
  }

  async matches(context: GMEContext) { // TODO: it might be nice to make this synchronous instead...
    const engine = await getEngine();
    this.ensureCanMatch();
    const assignments: EngineAssignment[] = engine.find_matches(
      context.toEngineJSON(),
      this.toEngineJSON(),
    );
    return assignments.map((a) => mapKeys(a.matches, (k) => this.nodePaths[k]));
  }

  ensureCanMatch() {
    const elements = this.getElements();
    const matchedNode = elements.find((element) =>
      element.type instanceof MatchedNode
    );
    assert(
      !matchedNode,
      new Error(
        "Matched nodes cannot be in input patterns: " +
          JSON.stringify(matchedNode),
      ),
    );
  }

  toEngineJSON() {
    const graph = this.graph.toEngineJSON();
    return { graph };
  }

  addElement(node: Element, nodePath: Option<GmeCommon.Path> = None): number {
    const index = this.graph.addNode(node);
    nodePath.map((nodePath) => this.nodePaths[index] = nodePath);
    return index;
  }

  getElements() {
    return this.graph.nodes.slice();
  }

  addRelation(srcIndex: number, dstIndex: number, relation: Relation.Relation) {
    return this.graph.addEdge(srcIndex, dstIndex, relation);
  }

  addCrossPatternRelation(
    src: NodePath | number,
    dst: NodePath | number,
    relation: Relation.Relation,
  ) {
    this.externalRelations.push([src, dst, relation]);
  }

  getRelationsWith(index: number) {
    const edges = this.graph.getEdges(index);
    this.externalRelations.forEach(([src, dst, relation]) => {
      if (src === index) {
        edges[0].push([src, dst, relation]);
      }
      if (dst === index) {
        edges[1].push([src, dst, relation]);
      }
    });
    return edges;
  }

  getAllRelations() {
    return this.graph.edges.concat(this.externalRelations);
  }

  async instantiate(
    context: GMEContext,
    assignments: EngineMatches,
    createdNodes: CreatedNodeDict,
    idPrefix = "node",
  ): Promise<JsonNode[]> {
    const elements: [Element, number][] = this.getElements().map((
      element,
      i,
    ) => [element, i]);
    const [nodeElements, otherElements] = partition(
      elements,
      ([e]) => e.type.isNode(),
    );
    const nodeIdFor = (index: string) => `@id:${idPrefix}_${index}`;

    const [matchedNodeElements, otherNodeElements] = partition(
      nodeElements,
      ([element]) => element.type instanceof MatchedNode,
    );
    const matchedNodes: [JsonNode, number][] = matchedNodeElements
      .map(([element, index]) => {
        // Resolving matched nodes is a little involved. We need to:
        //   - find the input element being referenced
        //   - resolve it to the match from the assignments
        //   - look up the createdNode corresponding to that match
        const inputElementPath = element.type.matchPath;
        const modelElement = assignments[inputElementPath];
        const nodePath = modelElement.Node;
        assert(
          !!createdNodes[nodePath],
          new NoMatchedNodeError(nodePath),
        );
        return [createdNodes[nodePath], index];
      });

    const newNodesStep: CreatedNodeDict = {};
    const newNodeElements = otherNodeElements
      .filter(([element]) => !element.type.isConstant());

    const newNodes: [JsonNode, number][] = newNodeElements.map(
      ([element, index]) => {
        const node = new JsonNode(nodeIdFor(index));

        if (assignments[element.originPath]) {
          const assignedElement = assignments[element.originPath];
          assert(
            !!assignedElement.Node,
            new UnimplementedError("Referencing non-Node origins"),
          );
          const nodePath = assignedElement.Node;
          createdNodes[nodePath] = node;
        }

        if (element.nodePath) {
          newNodesStep[element.nodePath] = node;
        }

        return [node, index];
      },
    );

    const nodes = newNodes.concat(matchedNodes);
    const getNodeAt = (index: number) => {
      const nodePair = nodes.find(([_n, i]) => i === index);
      assert(!!nodePair);
      return nodePair[0];
    };

    const updateElements = otherElements.filter(([e]) => !e.type.isConstant());
    await updateElements.reduce(async (prev, [element, index]) => {
      await prev;
      const [outEdges, inEdges] = this.getRelationsWith(index);
      if (
        element.type instanceof Attribute || element.type instanceof Pointer
      ) {
        const [[hasEdge], otherEdges] = partition(
          inEdges,
          ([_src, _dst, relation]) => relation instanceof Relation.Has,
        );
        assert(
          !!hasEdge,
          new MissingRelation(
            element.nodePath,
            new Relation.Has(),
          ),
        );

        // TODO: Check that there is only a single Has edge
        const nodeWJI = getNodeAt(hasEdge[0]);

        // Get the name/value information for With edges
        const [nameTuple, valueTuple] = getNameValueTupleFor(
          index,
          otherEdges.concat(outEdges),
        );
        const name = await this.resolveNodeProperty(
          context,
          assignments,
          newNodesStep,
          ...nameTuple,
        );
        const targetPath = await this.resolveNodeProperty(
          context,
          assignments,
          newNodesStep,
          ...valueTuple,
        );
        const field = element.type instanceof Attribute
          ? "attributes"
          : "pointers";
        nodeWJI[field][name] = targetPath;
      } else {
        throw new Error(
          `Unsupported element to instantiate: ${JSON.stringify(element)}`,
        );
      }
    }, Promise.resolve());

    // add child of relations
    this.getAllRelations()
      .filter(([_src, _dst, relation]) => relation instanceof Relation.ChildOf)
      .forEach(([src, dst]) => {
        const dstNode = getNodeAt(dst);
        const srcNode = getNodeAt(src);
        // FIXME: some parents are not being set...
        // Maybe they are the ones referencing another node tin the output pattern ?
        srcNode.parent = dstNode;
      });

    return newNodes.map(([node, _index]) => node);
  }

  async resolveNodeProperty(
    context: GMEContext,
    assignments: EngineMatches,
    newNodesStep: CreatedNodeDict, // nodes created for elements in the output pattern
    indexOrNodePath: number | NodePath,
    property: Property,
  ) {
    const isNodePath = typeof indexOrNodePath === "string";
    if (isNodePath) { // FIXME: does this only happen if it is in the input pattern?
      const node = context.loadByPath(indexOrNodePath);
      const elementNode = Pattern.getPatternChild(node);
      const elementType = elementNode.getNode(elementNode.data().pointers.base)
        .data()
        .attributes.name?.String;

      const elementPath = elementNode.data().id;
      if (elementType === "Constant") {
        return elementNode.data().attributes.value;
      } else if (elementType.includes("Node")) {
        return assignments[elementPath].Node; // FIXME: I believe this is incorrect
      } else if (elementType === "Attribute") {
        const [nodeId, attrName] = assignments[elementPath].Attribute;
        if (property === Property.Name) {
          return attrName;
        } else {
          const targetNode = context.loadByPath(nodeId);
          return targetNode.data().attributes[attrName];
        }
      } else {
        // TODO
      }

      // TODO: resolve the match?
      // TODO: convert it to an element?
      if (property === Property.Name) {
        return elementPath;
      } else {
      }
    } else {
      const element = this.getElements()[indexOrNodePath];
      if (element.type instanceof Constant) {
        return element.type.value;
      } else if (element.type instanceof NodeConstant) {
        return element.type.path;
      } else if (newNodesStep[element.nodePath]) { // referencing another output element
        return newNodesStep[element.nodePath].id;
      } else {
        assert(false, new Error(`Unknown element type`));
      }
    }
  }

  // TODO: should we make the pattern from a GME Context instead?
  //  would this be less efficient?
  static async fromNode(core: GmeClasses.Core, patternNode: Core.Node) {
    const relationType = Object.values(core.getAllMetaNodes(patternNode))
      .find((node) => core.getAttribute(node, "name") === "Relation");
    const isRelation = (node) => core.isTypeOf(node, relationType);
    const elementNodes = (await core.loadChildren(patternNode))
      .sort((n1, n2) => {
        if (isRelation(n1)) return 1;
        if (isRelation(n2)) return -1;
        // This next bit is an unfortunate workaround for now. The upcoming logic
        // for handling relations assumes that there is a 1:1 mapping btwn nodes
        // and the pattern elements they resolve to. However, this isn't the case
        // for the "Node" type since it specifies a base pointer. This is shorthand
        // for "AnyNode" with a pointer set
        // FIXME: Splice the elements instead to make sure the indices are correct
        const metaType1 = core.getAttribute(core.getBaseType(n1), "name");
        if (metaType1 === "Node") return 1;
        const metaType2 = core.getAttribute(core.getBaseType(n2), "name");
        if (metaType2 === "Node") return -1;

        return 0;
      });

    const context = await GMEContext.fromNode(core, patternNode);
    const pattern = new Pattern(context);

    const elementsByNodePath = {}; // mapping from node path to element
    await elementNodes.reduce(async (prev, node) => {
      await prev;
      const nodePath = core.getPath(node);
      if (!isRelation(node)) {
        let metaType = core.getAttribute(core.getBaseType(node), "name")
          .toString();
        if (metaType === "Node") { // Short-hand for AnyNode with a base pointer
          const originPath = core.getPointerPath(node, "origin");
          const baseId = core.getPointerPath(node, "type");
          const nodeElement = new Element(
            new AnyNode(),
            nodePath,
            originPath,
          );
          const pointer = new Element(new Pointer());
          const ptrName = new Element(new Constant("base"));
          const base = new Element(new NodeConstant(baseId));
          const nodeIndex = pattern.addElement(
            nodeElement,
            Some(core.getPath(node)),
          ); // need to add this element first
          const ptrIndex = pattern.addElement(pointer, None);
          const ptrNameIndex = pattern.addElement(ptrName, None);
          const baseIndex = pattern.addElement(base, None);

          pattern.addRelation(nodeIndex, ptrIndex, new Relation.Has());
          pattern.addRelation(
            ptrIndex,
            ptrNameIndex,
            new Relation.With(Property.Name, Property.Value),
          );
          pattern.addRelation(
            ptrIndex,
            baseIndex,
            new Relation.With(Property.Value, Property.Value),
          );
          elementsByNodePath[nodePath] = nodeElement;
        } else {
          const element = Pattern.getElementForNode(core, node, metaType);
          const nodePath: GmeCommon.Path = core.getPath(node);
          pattern.addElement(element, Some(nodePath));
          elementsByNodePath[nodePath] = element;
        }
      } else {
        const srcPath = core.getPointerPath(node, "src");
        const dstPath = core.getPointerPath(node, "dst");
        const elements = pattern.getElements();
        const srcElementIndex = elements.findIndex((element) =>
          srcPath === element.nodePath ||
          nodePathContains(element.nodePath, srcPath)
        );
        const dstElementIndex = elements.findIndex((element) =>
          dstPath === element.nodePath ||
          nodePathContains(element.nodePath, dstPath)
        );
        const srcElement = elements[srcElementIndex];
        const dstElement = elements[dstElementIndex];
        const src = await Endpoint.from(
          core,
          patternNode,
          srcPath,
          srcElement,
        );
        const dst = await Endpoint.from(
          core,
          patternNode,
          dstPath,
          dstElement,
        );
        const relation = Pattern.getRelationElementForNode(
          core,
          node,
          src,
          dst,
        );

        if (srcElementIndex !== -1 && dstElementIndex !== -1) {
          pattern.addRelation(srcElementIndex, dstElementIndex, relation);
        } else {
          const src = srcElementIndex === -1 ? srcPath : srcElementIndex;
          const dst = dstElementIndex === -1 ? dstPath : dstElementIndex;
          pattern.addCrossPatternRelation(src, dst, relation);
        }
      }
    }, Promise.resolve());

    return pattern;
  }

  /**
   * Given a node follow the containment hierarchy until we reach the child of a pattern.
   */
  static getPatternChild(node: GMEContext): GMEContext {
    let child = node;

    const isPatternType = (n: GMEContext) => {
      const baseType = n.getNode(n.data().pointers.base); // Follow all the way to the meta node?
      const attr = baseType.data().attributes.name;
      const typeName = attr?.String;
      return typeName.includes("Pattern") || typeName.includes("Structure");
    };

    while (child && !isPatternType(child.getParent())) {
      child = child.getParent();
    }
    return child;
  }

  static getElementForNode(
    core: GmeClasses.Core,
    node: Core.Node,
    metaType: string,
  ) {
    const type = Pattern.getElementTypeForNode(core, node, metaType);
    const nodePath = core.getPath(node);
    const originPath = core.getPointerPath(node, "origin");
    // FIXME: this should be the origin target -> not the node path
    return new Element(type, nodePath, originPath);
  }

  static getElementTypeForNode(
    core: GmeClasses.Core,
    node: Core.Node,
    metaType: string,
  ) {
    switch (metaType) {
      case "ActiveNode":
        return new ActiveNode();
      case "AnyNode":
        return new AnyNode();
      case "Attribute":
        return new Attribute();
      case "Constant":
        const value = core.getAttribute(node, "value");
        return new Constant(value);
      case "MatchedNode":
        const matchPath = core.getPointerPath(node, "match");
        return new MatchedNode(matchPath);
      //case "ExistingNode":
      //// TODO:
      //const id = core.getPath(node);
      //return new NodeConstant(id);
      case "Pointer":
        return new Pointer();
      default:
        throw new Error(`Unknown element type: ${metaType}`);
    }
  }

  static getRelationElementForNode(
    core: GmeClasses.Core,
    node: Core.Node,
    source: Endpoint,
    target: Endpoint,
  ) {
    const metaType = core.getAttribute(core.getBaseType(node), "name");
    const nodePath = core.getPath(node);
    switch (metaType) {
      case "has":
        return new Relation.Has(nodePath);
      case "with":
        const srcProperty = source.getProperty();
        const dstProperty = target.getProperty();
        return new Relation.With(srcProperty, dstProperty, nodePath);
      case "child of":
        return new Relation.ChildOf(nodePath);
      case "equal nodes":
        // Set a node property to another node.
        return new Relation.With(Property.Value, Property.Value, nodePath);
      default:
        throw new Error(`Unknown relation type: ${metaType}`);
    }
  }
}

class Graph {
  nodes: Element[];
  edges: [number, number, any][];
  private node_holes: never[];
  private edge_property: string;

  constructor() {
    this.nodes = [];
    this.edges = [];
    // The next fields are needed to deserialize properly to petgraph in rust
    this.node_holes = [];
    this.edge_property = "directed";
  }

  addNode(node): number {
    this.nodes.push(node);
    return this.nodes.length - 1;
  }

  addEdge(srcIndex, dstIndex, weight) {
    this.edges.push([srcIndex, dstIndex, weight]);
  }

  getEdges(index: number) {
    const edges = [[], []];
    this.edges.forEach((edge) => {
      const [src, dst] = edge;
      if (src === index) {
        edges[0].push(edge);
      }

      if (dst === index) {
        edges[1].push(edge);
      }
    });

    return edges;
  }

  toEngineJSON() {
    return {
      nodes: this.nodes.map((element) => element.type.toEngineJSON()),
      edges: this.edges.map((
        [srcIndex, dstIndex, relation],
      ) => [srcIndex, dstIndex, relation.toEngineJSON()]),
      node_holes: this.node_holes,
      edge_property: this.edge_property,
    };
  }
}

interface ElementType extends EngineSerializable {
  isNode(): boolean;
  isConstant(): boolean;
}

export class ActiveNode implements ElementType {
  isNode(): boolean {
    return true;
  }
  isConstant(): boolean {
    return false;
  }

  toEngineJSON() {
    return {
      Node: "ActiveNode",
    };
  }
}

export class AnyNode implements ElementType {
  isNode(): boolean {
    return true;
  }
  isConstant(): boolean {
    return false;
  }
  toEngineJSON() {
    return ({
      Node: "AnyNode",
    });
  }
}

class MatchedNode implements ElementType {
  matchPath: string;
  constructor(matchPath: string) {
    this.matchPath = matchPath;
  }
  isNode(): boolean {
    return true;
  }
  isConstant(): boolean {
    return false;
  }
  toEngineJSON() {
    return ({
      Node: { MatchedNode: this.matchPath },
    });
  }
}

export class Attribute implements ElementType {
  isNode(): boolean {
    return false;
  }
  isConstant(): boolean {
    return false;
  }
  toEngineJSON() {
    return "Attribute";
  }
}

export class Pointer implements ElementType {
  isNode(): boolean {
    return false;
  }
  isConstant(): boolean {
    return false;
  }
  toEngineJSON() {
    return "Pointer";
  }
}

export class Constant implements ElementType {
  value: any;
  constructor(value: any) {
    this.value = value;
  }

  isConstant(): boolean {
    return true;
  }
  isNode(): boolean {
    return false;
  }
  toEngineJSON() {
    return ({
      Constant: {
        Primitive: Primitive.from(this.value),
      },
    });
  }
}

class NodeConstant implements ElementType {
  path: string;

  constructor(path: string) {
    this.path = path;
  }
  isNode(): boolean {
    return true;
  }
  isConstant(): boolean {
    return true;
  }
  toEngineJSON() {
    return ({
      Constant: {
        Node: this.path,
      },
    });
  }
}

export class Element {
  type: ElementType;
  nodePath: string | undefined;
  originPath: string | undefined;

  constructor(type: ElementType, nodePath?: string, originPath?: string) {
    this.type = type;
    this.nodePath = nodePath;
    this.originPath = originPath;
  }
}

interface EngineSerializable {
  toEngineJSON(): any;
}

export namespace Relation {
  export interface Relation extends EngineSerializable {}

  export class Has implements Relation {
    nodePath?: NodePath;
    constructor(nodePath?: NodePath) {
      this.nodePath = nodePath;
    }

    toEngineJSON() {
      return "Has";
    }
  }

  export class ChildOf implements Relation {
    nodePath?: NodePath;
    constructor(nodePath?: NodePath) {
      this.nodePath = nodePath;
    }

    toEngineJSON() {
      return "ChildOf";
    }
  }

  export class With implements Relation {
    src: Property;
    dst: Property;
    nodePath?: NodePath;

    constructor(
      srcProperty: Property,
      dstProperty: Property,
      nodePath?: NodePath,
    ) {
      this.src = srcProperty;
      this.dst = dstProperty;
      this.nodePath = nodePath;
    }

    toEngineJSON() {
      return {
        With: [this.src, this.dst],
      };
    }
  }

  export class Equal implements Relation {
    nodePath?: NodePath;
    constructor(nodePath?: NodePath) {
      this.nodePath = nodePath;
    }

    toEngineJSON() {
      return "Equal";
    }
  }
}

export enum Property {
  Name = "Name",
  Value = "Value",
}

export namespace Primitive {
  export interface Primitive {}

  class String implements Primitive {
    String: string; // non-standard casing to make JSON rep engine-compatible
    constructor(String: string) {
      this.String = String;
    }
  }

  class Integer implements Primitive {
    Integer: number; // non-standard casing to make JSON rep engine-compatible
    constructor(Integer: number) {
      this.Integer = Integer;
    }
  }

  class Boolean implements Primitive {
    Boolean: boolean; // non-standard casing to make JSON rep engine-compatible
    constructor(Boolean: boolean) {
      this.Boolean = Boolean;
    }
  }

  export function from(value: any): Primitive {
    if (typeof value === "boolean") {
      return new Boolean(value);
    } else if (typeof value === "number") {
      return new Integer(value);
    } else {
      return new String(value);
    }
  }
}

/*
 * A wrapper for element/GME node endpoints
 */
class Endpoint {
  core: GmeClasses.Core;
  node: Core.Node;
  element: Element;

  constructor(core: GmeClasses.Core, node: Core.Node, element: Element) {
    this.core = core;
    this.node = node;
    this.element = element;
  }

  name() {
    return this.core.getAttribute(this.node, "name");
  }

  getProperty() {
    if (this.name() === "name") {
      return Property.Name;
    } else {
      return Property.Value;
    }
  }

  static async from(core, aNode, path, element) {
    const rootNode = core.getRoot(aNode);
    const node = await core.loadByPath(rootNode, path);
    return new Endpoint(core, node, element);
  }
}

// TODO: can the index be implicit? Maybe the first one?
// Should I make this more full-fledged? Like the rust version?
export class GMEContext implements EngineSerializable {
  nodes: GMENode[];
  private index: NodeIndex;
  private parentDict?: { [key: NodeIndex]: NodeIndex };
  // TODO:

  constructor(nodes: GMENode[], index = 0) {
    this.nodes = nodes;
    this.index = index;
  }

  getActiveNode(): GMENode {
    return this.nodes[0];
  }

  data(): GMENode {
    return this.nodes[this.index];
  }

  loadByPath(path: NodePath): GMEContext | undefined {
    return this.findNode((node) => node.id === path);
  }

  findNode(fn: (n: GMENode) => boolean): GMEContext {
    const index = this.nodes.findIndex(fn);
    if (index !== -1) {
      return this.getNode(index);
    }
  }

  getNode(index: NodeIndex): GMEContext {
    return new GMEContext(this.nodes, index);
  }

  getParent(): GMEContext | undefined {
    if (!this.parentDict) {
      const parentEntries = this.nodes.flatMap((node, index) => {
        return node.children.map((childIndex) => [childIndex, index]);
      });
      this.parentDict = Object.fromEntries(parentEntries);
    }
    const parentIndex = this.parentDict[this.index];
    return parentIndex && this.getNode(parentIndex);
  }

  toEngineJSON(): any {
    assert(this.index === 0);
    return { nodes: this.nodes };
  }

  union(otherContext: GMEContext) {
    // Create a context that contains all nodes in each
    const nodes = this.nodes.slice();

    // add the new nodes from otherContext to this list of nodes
    const newNodes = otherContext.nodes.filter((node) =>
      !nodes.find((existing) => existing.id === node.id)
    ).map((node) => node.clone());

    // update references for new nodes
    newNodes.forEach((node) => {
      node.updateReferences((idx) => {
        const ref = otherContext.getNode(idx);
        let nodeIdx = nodes.findIndex((node) => node.id === ref.data().id);
        if (nodeIdx === -1) {
          const relIndex = newNodes.findIndex((n) => n.id === ref.data().id);
          assert(
            relIndex > -1,
            new Error("Could not find referenced node in other context."),
          );
          nodeIdx = nodes.length + relIndex;
        }
        return nodeIdx;
      });
    });

    nodes.push(...newNodes);
    return new GMEContext(nodes, this.index);
  }

  validate() {
    const maxIndex = this.nodes.length - 1;
    this.nodes.forEach((node) => {
      const invalidChild = node.children.find((index) => index > maxIndex);
      if (invalidChild) {
        throw new InvalidChildError(node, invalidChild, maxIndex);
      }

      const invalidPtr = Object.entries(node.pointers).find(([_name, index]) =>
        index > maxIndex
      );
      if (invalidPtr) {
        throw new InvalidPointerError(node, ...invalidPtr, maxIndex);
      }

      const invalidSet = Object.entries(node.sets).find(([_name, idx]) =>
        idx.some((index) => index > maxIndex)
      );
      if (invalidSet) {
        const [name, members] = invalidSet;
        const memberIndex = members.find((idx) => idx > maxIndex);
        throw new InvalidSetError(node, name, memberIndex, maxIndex);
      }
    });
  }

  static async addNode(
    core: GmeClasses.Core,
    node: Core.Node,
    nodes: GMENode[],
  ): Promise<NodeIndex> {
    const gmeNode = await GMENode.fromNode(core, node);

    // add self
    const index = nodes.length;
    nodes.push(gmeNode);

    // some helpers...
    const root = core.getRoot(node);
    const getIndex = async (nodePath: string) => {
      let nodeIndex = nodes.findIndex((n) => n.id === nodePath);
      if (nodeIndex === -1) {
        const node = await core.loadByPath(root, nodePath);
        nodeIndex = await GMEContext.addNode(core, node, nodes);
      }

      return nodeIndex;
    };

    // add children
    const childPaths = core.getChildrenPaths(node);
    for (const childPath of childPaths) {
      const nodeIndex = await getIndex(childPath);
      gmeNode.children.push(nodeIndex);
    }

    // add pointers
    const pointers = core.getPointerNames(node);
    for (const pointer of pointers) {
      const targetPath = core.getPointerPath(node, pointer);
      if (!!targetPath) {
        const nodeIndex = await getIndex(targetPath);
        gmeNode.pointers[pointer] = nodeIndex;
      }
    }

    // add set members
    const setNames = core.getSetNames(node);
    for (const set of setNames) {
      const memberPaths = core.getMemberPaths(node, set);
      const memberIdx = await Promise.all(memberPaths.map(getIndex));
      gmeNode.sets[set] = memberIdx;
    }

    return index;
  }

  static async fromNode(
    core: GmeClasses.Core,
    node: Core.Node,
  ): Promise<GMEContext> {
    // TODO: put the node in a list and store all references to it by index instead
    const nodes = [];
    await GMEContext.addNode(core, node, nodes);

    nodes[0].isActive = true;
    return new GMEContext(nodes);
  }
}

type NodeIndex = number;
/*
 * A representation of the GME node required for the rust pattern engine.
 */
export class GMENode {
  id: NodePath;
  children: NodeIndex[];
  attributes: { [key: string]: any };
  pointers: { [name: string]: NodeIndex };
  sets: { [name: string]: NodeIndex[] };
  isActive: boolean;

  constructor(path: NodePath, attributes = {}) {
    this.id = path;
    this.attributes = attributes;
    this.children = [];
    this.pointers = {}; // TODO
    this.isActive = false;
    this.sets = {};
  }

  setActiveNode(isActive = true) {
    this.isActive = isActive;
  }

  updateReferences(fn: (idx: NodeIndex) => NodeIndex): void {
    this.children = this.children.map(fn);
    this.pointers = mapValues(
      this.pointers,
      fn,
    );
    this.sets = mapValues(
      this.sets,
      (indices) => indices.map(fn),
    );
  }

  clone(): GMENode {
    const copy = new GMENode(this.id, this.attributes);
    copy.children = this.children.slice();
    copy.pointers = clone(this.pointers);
    copy.sets = clone(
      this.sets,
    );
    copy.isActive = this.isActive;
    return copy;
  }

  static async fromNode(core: GmeClasses.Core, node: Core.Node) {
    const attributes = Object.fromEntries(
      core.getAttributeNames(node)
        .map((name) => [name, Primitive.from(core.getAttribute(node, name))]),
    );
    const gmeNode = new GMENode(core.getPath(node), attributes);
    return gmeNode;
  }
}

function partitionBy<T>(
  list: T[],
  keyFn: (item: T) => string,
): { [key: string]: T[] } {
  const result = {};
  list.forEach((item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  });
  return result;
}

function partition<T>(list: T[], fn: (item: T) => boolean) {
  const result = [[], []];
  list.forEach((item) => {
    const index = fn(item) ? 0 : 1;
    result[index].push(item);
  });
  return result;
}

function assert(cond: boolean, error = new Error("Assert failed")) {
  if (!cond) {
    throw error;
  }
}

// The following function returns the name and value for the given attribute
// (or pointer) in the input pattern.
//
// For example, suppose an Attribute node, A1, is connected to two other attributes: A2, A3.
// We might connect the name port of A1 to the value port of A2 and the value port of A1 to
// the name port of A3. Passing A1 to this function would return:
//
//  [A2 (index), Property.Value]  // this one is first since it is connected to "name" of A1
//  [A3 (index), Property.Name]
//
function getNameValueTupleFor(attrIndex: number, edges) {
  let name: [number, Property];
  let value: [number, Property];

  const withEdges: [number, number, Relation.With][] = edges
    .filter(([, , relation]) => relation instanceof Relation.With);

  // FIXME: what if there is no with edge for the value of a pointer?
  // FIXME: we could add a "WithNode"
  for (const edge of withEdges) {
    const [srcIndex, dstIndex, relation] = edge;
    const endpoints: [[number, Property], [number, Property]] = [
      [srcIndex, relation.src],
      [dstIndex, relation.dst],
    ];

    const [endpoint, otherEndpoint] = endpoints
      .sort(([index]) => index === attrIndex ? -1 : 1);

    if (endpoint[1] === Property.Name) {
      name = otherEndpoint;
    } else {
      value = otherEndpoint;
    }

    if (name && value) {
      return [name, value];
    }
  }
  return [name, value];
}

function nodePathContains(parent: NodePath, maybeChild: NodePath): boolean {
  return maybeChild.startsWith(parent + "/");
}

function mapKeys<T>(obj: { [key: string]: T }, fn: (k: string) => string) {
  const entries = Object.entries(obj)
    .map(([k, v]) => [fn(k), v])
    .filter(([k, _v]) => k !== undefined);
  return Object.fromEntries(entries);
}

interface ModelError {
  nodePath: string;
}

class MissingRelation extends Error implements ModelError {
  nodePath: string;
  relation: Relation.Relation;

  constructor(nodePath: string, relation: Relation.Relation) {
    super(`Missing relation with ${nodePath}: ${relation.constructor.name}`);
    this.nodePath = nodePath;
    this.relation = relation;
  }
}

class NoMatchedNodeError extends Error {
  nodePath: string;

  constructor(nodePath: string) {
    super(`Could not find node created (in previous step) for ${nodePath}`);
    this.nodePath = nodePath;
  }
}

class UnimplementedError extends Error {
  action: string;

  constructor(action: string) {
    super(`${action} not yet supported.`);
    this.action = action;
  }
}

// An assignment returned from the engine
interface EngineAssignment {
  matches: EngineMatches;
}

type EngineMatches = { [nodeIndex: number]: Reference }; // from engine/src/assignment.rs

type Reference = NodeRef | AttrRef | PtrRef | SetRef;
interface NodeRef {
  Node: NodePath;
}

interface AttrRef {
  Attribute: [NodePath, string];
}

interface PtrRef {
  Pointer: [NodePath, string];
}

interface SetRef {
  Set: [NodePath, string];
}

type CreatedNodeDict = { [nodePath: NodePath]: JsonNode };

// FIXME: we should probably swap to WJI instead...
export class JsonNode {
  id: string;
  attributes: { [key: string]: Primitive.Primitive };
  pointers: { [key: string]: string };
  children: JsonNode[];
  parent: JsonNode | undefined;

  constructor(id: string) {
    this.id = id;
    this.attributes = {};
    this.pointers = {};
    this.children = [];
  }
}

function mapValues<T, O>(
  obj: { [key: string]: T },
  fn: (i: T) => O,
): { [key: string]: O } {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
}

export class ValidationError extends Error {}

class InvalidIndexError extends ValidationError {
  constructor(
    node: GMENode,
    name: string,
    childIndex: NodeIndex,
    maxIndex: NodeIndex,
  ) {
    const msg = `GMENode has invalid child index (max): ${childIndex}\n${
      JSON.stringify(node, null, 2)
    }`;
    super(msg);
  }
}

export class InvalidChildError extends InvalidIndexError {
  constructor(node: GMENode, childIndex: NodeIndex, maxIndex: NodeIndex) {
    super(node, "child", childIndex, maxIndex);
  }
}

export class InvalidPointerError extends InvalidIndexError {
  constructor(
    node: GMENode,
    pointer: string,
    target: NodeIndex,
    maxIndex: NodeIndex,
  ) {
    super(node, `pointer (${pointer})`, target, maxIndex);
  }
}

export class InvalidSetError extends InvalidIndexError {
  constructor(
    node: GMENode,
    set: string,
    target: NodeIndex,
    maxIndex: NodeIndex,
  ) {
    super(node, `set (${set})`, target, maxIndex);
  }
}

function clone<T>(primitive: T): T {
  return JSON.parse(JSON.stringify(primitive));
}
