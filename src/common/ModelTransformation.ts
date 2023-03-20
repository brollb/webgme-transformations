import { None, Option, Some } from "oxide.ts";

declare global {
  // Workaround for issue in webgme types
  type GLbyte = number;
}
//@ts-ignore
import type from "webgme";

import engineModule from "./engine/index";
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

  async apply(activeNode: Core.Node) {
    const node: GMENode = await GMENode.fromNode(this.core, activeNode);
    node.setActiveNode();
    const createdNodes = {};
    const newNodes = await this.steps.reduce(async (refDataP, step) => {
      const refData = await refDataP;
      const matchOutputs = await step.apply(node, activeNode, createdNodes);
      return refData.concat(...matchOutputs);
    }, Promise.resolve([]));

    return this._toTree(newNodes);
  }

  _toTree(nodes: JsonNode[]) {
    const [roots, children] = partition(nodes, (node) => !node.parent);
    children.forEach((child) => {
      child.parent.children.push(child);
      delete child.parent;
    });
    return roots;
  }

  // TODO: for each assignment:
  // TODO: create the output pattern using the assignment values
  // TODO: sort the elements -> (parent) nodes -> attributes/pointers/etc

  static async fromNode(core: GmeClasses.Core, node: Core.Node) {
    const stepNodes = sortNodeList(core, await core.loadChildren(node), "next");
    console.log(
      "steps:",
      stepNodes.map((c) => [core.getPath(c), core.getAttribute(c, "name")]),
    );
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
  private core: GmeClasses.Core;
  private pattern: Pattern;
  private outputPattern: Pattern;

  constructor(name: string, core: GmeClasses.Core, pattern: Pattern, outputPattern: Pattern) {
    this.name = name;
    this.core = core;
    this.pattern = pattern;
    this.pattern.ensureCanMatch();
    this.outputPattern = outputPattern;
  }

  async apply(node, gmeNode, createdNodes = {}) {
    console.log("---> applying step", this.name);
    const matches = await this.pattern.matches(node);
    const outputs = await Promise.all(matches.map(
      (match, index) =>
        this.outputPattern.instantiate(
          this.core,
          gmeNode,
          match,
          createdNodes,
          index,
        ),
    ));
    return outputs;
  }

  static async fromNode(core: GmeClasses.Core, node: Core.Node) {
    const children = await core.loadChildren(node);
    const inputNode = children.find((child) =>
      core.getAttribute(child, "name").includes("Input")
    );
    const outputNode = children.find((child) =>
      core.getAttribute(child, "name").includes("Output")
    );
    const [inputPattern, outputPattern] = await Promise.all([
      Pattern.fromNode(core, inputNode),
      Pattern.fromNode(core, outputNode),
    ]);

    console.log("input node path:", core.getPath(inputNode));
    const name = core.getAttribute(node, "name");
    return new TransformationStep(name, core, inputPattern, outputPattern);
  }
}

type NodePath = string;
export class Pattern {
  private graph: Graph;
  private externalRelations: any[];
  private nodePaths: { [key: number]: NodePath };

  constructor() {
    this.graph = new Graph();
    this.externalRelations = [];
    this.nodePaths = {};
  }

  async matches(node) { // TODO: it might be nice to make this synchronous instead...
    const engine = await getEngine();
    this.ensureCanMatch();
    const assignments = engine.find_matches(node, this.toEngineJSON());
    console.log("find_matches:", node, this.toEngineJSON(), "\n", {
      assignments,
    });
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

  addElement(node: Element, nodePath: Option<GmeCommon.Path>) {
    const index = this.graph.addNode(node);
    nodePath.map(nodePath => this.nodePaths[index] = nodePath);
    return index;
  }

  getElements() {
    return this.graph.nodes.slice();
  }

  addRelation(srcIndex: number, dstIndex: number, relation: Relation.Relation) {
    console.log('add relation', relation, 'btwn', srcIndex, dstIndex);
    return this.graph.addEdge(srcIndex, dstIndex, relation);
  }

  addCrossPatternRelation(src, dst, relation) {
    this.externalRelations.push([src, dst, relation]);
  }

  getRelationsWith(index) {
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

  async instantiate(core: GmeClasses.Core, node, assignments, createdNodes, idPrefix = "node") {
    const elements: [Element, number][] = this.getElements().map((element, i) => [element, i]);
    console.log({ elements });
    const [nodeElements, otherElements] = partition(
      elements,
      ([e]) => e.type.isNode()
    );
    const nodeIdFor = (index: string) => `@id:${idPrefix}_${index}`;

    const [matchedNodeElements, otherNodeElements] = partition(
      nodeElements,
      ([element]) => element.type instanceof MatchedNode,
    );
    const matchedNodes = matchedNodeElements
      .map(([element, index]) => {
        // Resolving matched nodes is a little involved. We need to:
        //   - find the input element being referenced
        //   - resolve it to the match from the assignments
        //   - look up the createdNode corresponding to that match
        const inputElementPath = element.type.matchPath;
        const modelElement = assignments[inputElementPath];
        const nodePath = modelElement.Node;
        assert(
          createdNodes[nodePath],
          new NoMatchedNodeError(nodePath),
        );
        return [createdNodes[nodePath], index];
      });

    const newNodes = otherNodeElements.map(([element, index]) => {
      const node = new JsonNode(nodeIdFor(index));

      if (assignments[element.originPath]) {
        const assignedElement = assignments[element.originPath];
        assert(
          assignedElement.Node,
          new UnimplementedError("Referencing non-Node origins"),
        );
        const nodePath = assignedElement.Node;
        createdNodes[nodePath] = node;
      }
      return [node, index];
    });

    const nodes = newNodes.concat(matchedNodes);
    const getNodeAt = (index: number) => {
      const nodePair = nodes.find(([_n, i]) => i === index);
      assert(nodePair);
      return nodePair[0];
    };

    console.log({ nodes });
    const updateElements = otherElements.filter(([e]) => !e.type.isConstant());
    await updateElements.reduce(async (prev, [element, index]) => {
      await prev;
      const [outEdges, inEdges] = this.getRelationsWith(index);
      if (element.type instanceof Attribute || element.type instanceof Pointer) {
        const [[hasEdge], otherEdges] = partition(
          inEdges,
          ([_src, _dst, relation]) => relation instanceof Relation.Has,
        );
        assert(
          hasEdge,
          new UninstantiableError(
            `${JSON.stringify(element.type)} missing source node ("Has" relation)`,
          ),
        );

        // FIXME: why might this not find a node?
        console.log({ hasEdge });
        const nodeWJI = getNodeAt(hasEdge[0]);
        const [nameTuple, valueTuple] = getNameValueTupleFor(
          index,
          otherEdges.concat(outEdges),
        );
        console.log({ nameTuple })
        const rootNode = core.getRoot(node);
        const name = await this.resolveNodeProperty(
          core,
          rootNode,
          assignments,
          ...nameTuple,
        );
        const targetPath = await this.resolveNodeProperty(
          core,
          rootNode,
          assignments,
          ...valueTuple,
        );
        const field = element.type instanceof Attribute ? "attributes" : "pointers";
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
        srcNode.parent = dstNode;
      });

    return newNodes.map(([node, index]) => node);
  }

  async resolveNodeProperty(
    core: GmeClasses.Core,
    rootNode: Core.Node,
    assignments,
    indexOrNodePath,
    property,
  ) {
    const isNodePath = typeof indexOrNodePath === "string";
    if (isNodePath) {
      const node = await core.loadByPath(rootNode, indexOrNodePath);
      const elementNode = Pattern.getPatternChild(core, node);
      const elementType: string = core.getAttribute(
        core.getBaseType(elementNode),
        "name",
      );
      const elementPath = core.getPath(elementNode);
      if (elementType === "Constant") {
        return core.getAttribute(elementNode, "value");
      } else if (elementType.includes("Node")) {
        return assignments[elementPath].Node;
      } else if (elementType === "Attribute") {
        const [nodeId, attrName] = assignments[elementPath].Attribute;
        if (property === Property.Name) {
          return attrName;
        } else {
          const targetNode = await core.loadByPath(rootNode, nodeId);
          return core.getAttribute(targetNode, attrName);
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
      } else {
        assert(false, new Error(`Unknown element type`));
      }
    }
  }

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

    const pattern = new Pattern();

    const elementsByNodePath = {};  // mapping from node path to element
    await elementNodes.reduce(async (prev, node) => {
      await prev;
      const nodePath = core.getPath(node);
      if (!isRelation(node)) {
        let metaType = core.getAttribute(core.getBaseType(node), "name");
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
        const srcElementIndex = elements.findIndex(element => srcPath.startsWith(element.nodePath));
        const dstElementIndex = elements.findIndex(element => dstPath.startsWith(element.nodePath));
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

  static getPatternChild(core, node) {
    let child = node;
    const isPatternType = (n) => {
      const metaType = core.getAttribute(core.getBaseType(n), "name");
      return metaType.includes("Pattern") || metaType.includes("Structure");
    };
    while (child && !isPatternType(core.getParent(child))) {
      child = core.getParent(child);
    }
    return child;
  }

  static getElementForNode(core, node, metaType) {
    const type = Pattern.getElementTypeForNode(core, node, metaType);
    const nodePath = core.getPath(node);
    const originPath = core.getPointerPath(node, "origin");
    // FIXME: this should be the origin target -> not the node path
    return new Element(type, nodePath, originPath);
  }

  static getElementTypeForNode(core, node, metaType) {
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

  static getRelationElementForNode(core, node, source, target) {
    const metaType = core.getAttribute(core.getBaseType(node), "name");
    switch (metaType) {
      case "has":
        return new Relation.Has();
      case "with":
        const srcProperty = source.getProperty();
        const dstProperty = target.getProperty();
        return new Relation.With(srcProperty, dstProperty);
      case "child of":
        return new Relation.ChildOf();
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

  addNode(node) {
    this.nodes.push(node);
    return this.nodes.length - 1;
  }

  addEdge(srcIndex, dstIndex, weight) {
    this.edges.push([srcIndex, dstIndex, weight]);
  }

  getEdges(index) {
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
      edges: this.edges.map(([srcIndex, dstIndex, relation]) => [srcIndex, dstIndex, relation.toEngineJSON()]),
      node_holes: this.node_holes,
      edge_property: this.edge_property,
    };
  }
}

interface ElementType extends EngineSerializable {
  isNode(): boolean;
  isConstant(): boolean;
}

class ActiveNode implements ElementType {
  isNode(): boolean { return true; }
  isConstant(): boolean { return false; }

  toEngineJSON() {
    return {
      Node: "ActiveNode",
    };
  }
}

class AnyNode implements ElementType {
  isNode(): boolean { return true; }
  isConstant(): boolean { return false; }
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
  isNode(): boolean { return true; }
  isConstant(): boolean { return false; }
  toEngineJSON() {
    return ({
      Node: { MatchedNode: this.matchPath },
    });
  }
}

class Attribute implements ElementType {
  isNode(): boolean { return false; }
  isConstant(): boolean { return false; }
  toEngineJSON() {
    return "Attribute";
  }
}

class Pointer implements ElementType {
  isNode(): boolean { return false; }
  isConstant(): boolean { return false; }
  toEngineJSON() {
    return "Pointer";
  }
}

class Constant implements ElementType {
  value: any;
  constructor(value: any) {
    this.value = value;
  }

  isConstant(): boolean { return true; }
  isNode(): boolean { return false; }
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
  isNode(): boolean { return true; }
  isConstant(): boolean { return true; }
  toEngineJSON() {
    return ({
      Constant: {
        Node: this.path,
      },
    });
  }
}

class Element {
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

namespace Relation {
  export interface Relation extends EngineSerializable { }

  export class Has implements Relation {
    toEngineJSON() {
      return "Has";
    }
  }

  export class ChildOf implements Relation {
    toEngineJSON() {
      return "ChildOf";
    }
  }

  export class With implements Relation {
    src: Property;
    dst: Property;

    constructor(srcProperty: Property, dstProperty: Property) {
      this.src = srcProperty;
      this.dst = dstProperty;
    }

    toEngineJSON() {
      return {
        With: [this.src, this.dst],
      };
    }
  }
}

enum Property {
  Name = "Name",
  Value = "Value",
}

namespace Primitive {
  export interface Primitive { }

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

/*
 * A representation of the GME node required for the rust pattern engine.
 */
class GMENode {
  id: string;
  attributes: { [key: string]: any };
  children: GMENode[];
  is_active: boolean;
  pointers: { [key: string]: any };

  constructor(path, attributes = {}) {
    this.id = path;
    this.attributes = attributes;
    this.children = [];
    this.pointers = {}; // TODO
    this.is_active = false;
  }

  setActiveNode(isActive = true) {
    this.is_active = isActive;
  }

  static async fromNode(core: GmeClasses.Core, node: Core.Node) {
    const children = await core.loadChildren(node);
    const attributes = Object.fromEntries(
      core.getOwnAttributeNames(node)
        .map((name) => [name, Primitive.from(core.getAttribute(node, name))]),
    );
    const gmeNode = new GMENode(core.getPath(node), attributes);
    gmeNode.children = await Promise.all(
      children.map((child) => GMENode.fromNode(core, child)),
    );
    // TODO: Add pointers, etc
    return gmeNode;
  }
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

function mapKeys<T>(obj: { [key: string]: T }, fn: (k: string) => string) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [fn(k), v]),
  );
}

class UninstantiableError extends Error { }
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

// FIXME: we should probably swap to WJI instead...
class JsonNode {
  id: string;
  attributes: { [key: string]: string }; // FIXME: better value type
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
