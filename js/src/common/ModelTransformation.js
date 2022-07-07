define(['./engine/index'], function(engineModule) {
	let enginePromise;
	function getEngine() {
		if (!enginePromise) {
			enginePromise = engineModule.create();
		}
		return enginePromise;
	}

	class Transformation {
		constructor(core, steps) {
			this.core = core;
			this.steps = steps;
			// TODO: We may want to create an interface to use with the core (like Umesh mentioned a while ago) so
			// this can create WJI or GME nodes. Technically, WJI can be imported but this has decent perf overhead.
			// First, we should just see if we can optimize WJI
		}

		async apply(activeNode) {
			const node = await GMENode.fromNode(this.core, activeNode);
			node.setActiveNode();
			const createdNodes = {};
			const newNodes = await this.steps.reduce(async (refDataP, step) => {
				const refData = await refDataP;
				const matchOutputs = await step.apply(node, activeNode, createdNodes);
				return refData.concat(...matchOutputs);
			}, Promise.resolve([]));

			return this._toTree(newNodes);
		}

		_toTree(nodes) {
			const [roots, children] = partition(nodes, node => !node.parent);
			children.forEach(child => {
				child.parent.children.push(child);
				delete child.parent;
			});
			return roots;
		}

		// TODO: for each assignment:
			// TODO: create the output pattern using the assignment values
			// TODO: sort the elements -> (parent) nodes -> attributes/pointers/etc

		static async fromNode(core, node) {
			const stepNodes = sortNodeList(core, await core.loadChildren(node), 'next');
			console.log('steps:', stepNodes.map(c => [core.getPath(c), core.getAttribute(c, 'name')]))
			const steps = await Promise.all(stepNodes.map(step => TransformationStep.fromNode(core, step)));
			return new Transformation(core, steps);
		}
	}

	function sortNodeList(core, nodes, ptr)  {
		const nodeDict = Object.fromEntries(
			nodes.map(n => [core.getPath(n), n])
		);
		const start = nodes.find(node => {
			const nodePath = core.getPath(node);
			const predecessor = nodes.find(p => core.getPointerPath(p, ptr) === nodePath);
			return !predecessor;
		});

		const list = [];
		let node = start;
		while (node) {
			if (list.includes(node)) {
				throw new Error('Transformation steps have a cycle!');
			}
			list.push(node);
			const nextPath = core.getPointerPath(node, ptr);
			node = nodeDict[nextPath];
		}

		return list;
	}

	class TransformationStep {
		constructor(name, core, pattern, outputPattern) {
			this.name = name;
			this.core = core;
			this.pattern = pattern;
			this.pattern.ensureCanMatch();
			this.outputPattern = outputPattern;
		}

		async apply(node, gmeNode, createdNodes={}) {
			console.log('---> applying step', this.name);
			const matches = await this.pattern.matches(node);
			const outputs = await Promise.all(matches.map(
				(match, index) => this.outputPattern.instantiate(this.core, gmeNode, match, createdNodes, index)
			));
			return outputs;
		}

		static async fromNode(core, node) {
			const children = await core.loadChildren(node);
			const inputNode = children.find(child => core.getAttribute(child, 'name').includes('Input'));
			const outputNode = children.find(child => core.getAttribute(child, 'name').includes('Output'));
			const [inputPattern, outputPattern] = await Promise.all([
				Pattern.fromNode(core, inputNode),
				Pattern.fromNode(core, outputNode),
			]);

			console.log('input node path:', core.getPath(inputNode));
			const name = core.getAttribute(node, 'name');
			return new TransformationStep(name, core, inputPattern, outputPattern);
		}
	}

	class Pattern {
		constructor() {
			this.graph = new Graph();
			this.externalRelations = [];
			this.nodePaths = {};
		}

		async matches(node) {  // TODO: it might be nice to make this synchronous instead...
			const engine = await getEngine();
			this.ensureCanMatch();
			const assignments = engine.find_matches(node, this.toEngineJSON());
			return assignments.map(a => mapKeys(a.matches, k => this.nodePaths[k]));
		}

		ensureCanMatch() {
			this.getElements().forEach(
				element => assert(
					!element?.Node?.MatchedNode,
					'Matched nodes cannot be in input patterns: ' + JSON.stringify(element)
				)
			);
		}

		toEngineJSON() {
			const graph = this.graph.toEngineJSON();
			return {graph};
		}

		addElement(node, nodePath) {
			const index = this.graph.addNode(node);
			this.nodePaths[index] = nodePath;
			return index;
		}

		getElements() {
			return this.graph.nodes.slice();
		}

		addRelation(srcIndex, dstIndex, relation) {
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

		async instantiate(core, node, assignments, createdNodes, idPrefix='node') {
			const elements = this.getElements().map((element, i) => [element, i]);
			const [nodeElements, otherElements] = partition(elements, ([e, i]) => e.type.Node);
			const nodeIdFor = index => `@id:${idPrefix}_${index}`;

			const [matchedNodeElements, otherNodeElements] = partition(
				nodeElements,
				([element]) => element.type?.Node?.MatchedNode
			);
			const matchedNodes = matchedNodeElements
				.map(([element, index]) => {
					// Resolving matched nodes is a little involved. We need to:
					//   - find the input element being referenced
					//   - resolve it to the match from the assignments
					//   - look up the createdNode corresponding to that match
					const inputElementPath = element.type?.Node?.MatchedNode;
					const modelElement = assignments[inputElementPath];
					const nodePath = modelElement.Node;
					assert(
						createdNodes[nodePath],
						new NoMatchedNodeError(nodePath)
					);
					return [createdNodes[nodePath], index];
				})

			const newNodes = otherNodeElements.map(([element, index]) => {
				const node = {
					id: nodeIdFor(index),
					attributes: {},
					pointers: {},
					children: [],
				};

				if (assignments[element.originPath]) {
					const assignedElement = assignments[element.originPath];
					assert(assignedElement.Node, new UnimplementedError('Referencing non-Node origins'));
					const nodePath = assignedElement.Node;
					createdNodes[nodePath] = node;
				}
				return [node, index];
			});

			const nodes = newNodes.concat(matchedNodes);
			const getNodeAt = index => {
				const nodePair = nodes.find(([n, i]) => i === index);
				assert(nodePair);
				return nodePair[0];
			};

			console.log({nodes});
			const updateElements = otherElements.filter(([e, i]) => !e.type.Constant);
			await updateElements.reduce(async (prev, [element, index]) => {
				await prev;
				const [outEdges, inEdges] = this.getRelationsWith(index);
				if (element.type === 'Attribute' || element.type === 'Pointer') {
					const [[hasEdge], otherEdges] = partition(inEdges, ([src, dst, relation]) => relation === 'Has');
					assert(
						hasEdge,
						new UninstantiableError(`${element.type} missing source node ("Has" relation)`)
					);

					const nodeWJI = getNodeAt(hasEdge[0]);
					const [nameTuple, valueTuple] = getNameValueTupleFor(index, otherEdges.concat(outEdges));
					const rootNode = core.getRoot(node);
					const name = await this.resolveNodeProperty(core, rootNode, assignments, ...nameTuple);
					const targetPath = await this.resolveNodeProperty(core, rootNode, assignments, ...valueTuple);
					const field = element.type === 'Attribute' ? 'attributes' : 'pointers';
					nodeWJI[field][name] = targetPath;
				} else {
					throw new Error(`Unsupported element to instantiate: ${JSON.stringify(element)}`);
				}
			}, Promise.resolve());

			// add child of relations
			const childRelations = this.getAllRelations()
				.filter(([src, dst, relation]) => relation === 'ChildOf')
				.map(([src, dst]) => {
					const dstNode = getNodeAt(dst);
					const srcNode = getNodeAt(src);
					srcNode.parent = dstNode;
				});

			return newNodes.map(([node, index]) => node);
		}

		async resolveNodeProperty(core, rootNode, assignments, indexOrNodePath, property) {
			const isNodePath = typeof indexOrNodePath === 'string';
			if (isNodePath) {
				const node = await core.loadByPath(rootNode, indexOrNodePath);
				const elementNode = Pattern.getPatternChild(core, node);
				const elementType = core.getAttribute(core.getMetaType(elementNode), 'name');
				const elementPath = core.getPath(elementNode);
				if (elementType === 'Constant') {
					return core.getAttribute(elementNode, 'value');
				} else if (elementType.includes('Node')) {
					return assignments[elementPath].Node;
				} else if (elementType === 'Attribute') {
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
				if (element.type.Constant?.Primitive) {
					return Object.values(element.type.Constant.Primitive).pop();
				} else if (element.type.Constant?.Node) {
					return element.type.Constant.Node;
				} else {
					assert(false, new Error(`Unknown element type`));
				}
			}
		}

		static async fromNode(core, patternNode) {
			const relationType = Object.values(core.getAllMetaNodes(patternNode))
				.find(node => core.getAttribute(node, 'name') === 'Relation');
			const isRelation = node => core.isTypeOf(node, relationType);
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
					const metaType1 = core.getAttribute(core.getMetaType(n1), 'name');
					if (metaType1 === 'Node') return 1;
					const metaType2 = core.getAttribute(core.getMetaType(n2), 'name');
					if (metaType2 === 'Node') return -1;

					return 0;
				});

			const pattern = new Pattern();

			await elementNodes.reduce(async (prev, node) => {
				await prev;
				const nodePath = core.getPath(node);
				if (!isRelation(node)) {
					let metaType = core.getAttribute(core.getMetaType(node), 'name');
					if (metaType === 'Node') {  // Short-hand for AnyNode with a base pointer
						const originPath = core.getPointerPath(node, 'origin');
						const baseId = core.getPointerPath(node, 'type');
						const nodeElement = new Element(ElementType.AnyNode(), nodePath, originPath);
						const pointer = new Element(ElementType.Pointer());
						const ptrName = new Element(ElementType.Constant('base'));
						const base = new Element(ElementType.NodeConstant(baseId));
						const nodeIndex = pattern.addElement(nodeElement, core.getPath(node));  // need to add this element first
						const ptrIndex = pattern.addElement(pointer);
						const ptrNameIndex = pattern.addElement(ptrName);
						const baseIndex = pattern.addElement(base);

						pattern.addRelation(nodeIndex, ptrIndex, Relation.Has());
						pattern.addRelation(
							ptrIndex,
							ptrNameIndex,
							Relation.With(Property.Name, Property.Value)
						);
						pattern.addRelation(
							ptrIndex,
							baseIndex,
							Relation.With(Property.Value, Property.Value)
						);
					} else {
						const element = Pattern.getElementForNode(core, node, metaType);
						pattern.addElement(element, core.getPath(node));
					}
				} else {
					const srcPath = core.getPointerPath(node, 'src');
					const srcIndex = elementNodes.findIndex(n => core.getPath(n) === srcPath);
					const dstPath = core.getPointerPath(node, 'dst');
					const dstIndex = elementNodes.findIndex(n => core.getPath(n) === dstPath);

					// FIXME: this currently assumes a 1:1 mapping btwn nodes and elements
					const elements = pattern.getElements();
					const src = await Endpoint.from(core, patternNode, srcPath, elements[srcIndex]);
					const dst = await Endpoint.from(core, patternNode, dstPath, elements[dstIndex]);
					const relation = Pattern.getRelationElementForNode(core, node, src, dst);
					// get the index for the element itself (ie, not the port ID)
					const srcElement = Pattern.getPatternChild(core, src.node);
					const srcElementIndex = elementNodes.findIndex(node => node === srcElement);
					const dstElement = Pattern.getPatternChild(core, dst.node);
					const dstElementIndex = elementNodes.findIndex(node => node === dstElement);

					if (srcElementIndex !== -1 && dstElementIndex !== -1) {
						pattern.addRelation(srcElementIndex, dstElementIndex, relation);
					} else {
						const src = srcElementIndex === -1 ? srcPath : srcElementIndex;
						const dst = dstElementIndex === -1 ? dstPath : dstElementIndex;
						const patternPath = core.getPath(patternNode);
						pattern.addCrossPatternRelation(src, dst, relation);
					}
				}

			}, Promise.resolve());

			return pattern;
		}

		static getPatternChild(core, node) {
			let child = node;
			const isPatternType = n => {
				const metaType = core.getAttribute(core.getMetaType(n), 'name');
				return metaType.includes('Pattern') || metaType.includes('Structure');
			};
			while (child && !isPatternType(core.getParent(child))) {
				child = core.getParent(child);
			}
			return child;
		}

		static getElementForNode(core, node, metaType) {
			const type = Pattern.getElementTypeForNode(core, node, metaType);
			const nodePath = core.getPath(node);
			const originPath = core.getPointerPath(node, 'origin');
			// FIXME: this should be the origin target -> not the node path
			return new Element(type, nodePath, originPath);
		}

		static getElementTypeForNode(core, node, metaType) {
			switch (metaType) {
				case "ActiveNode":
					return ElementType.ActiveNode();
				case "AnyNode":
					return ElementType.AnyNode();
				case "Attribute":
					return ElementType.Attribute();
				case "Constant":
					const value = core.getAttribute(node, 'value');
					return ElementType.Constant(value);
				case "MatchedNode":
					const matchPath = core.getPointerPath(node, 'match');
					return ElementType.MatchedNode(matchPath);
				//case "ExistingNode":
					//// TODO: 
					//const id = core.getPath(node);
					//return Element.NodeConstant(id);
				case "Pointer":
					return ElementType.Pointer();
				default:
					throw new Error(`Unknown element type: ${metaType}`);
			}
		}

		static getRelationElementForNode(core, node, source, target) {
			const metaType = core.getAttribute(core.getMetaType(node), 'name');
			switch (metaType) {
				case "has":
					return Relation.Has();
				case "with":
					const srcProperty = source.getProperty();
					const dstProperty = target.getProperty();
					return Relation.With(srcProperty, dstProperty);
				case "child of":
					return Relation.ChildOf();
				default:
					throw new Error(`Unknown relation type: ${metaType}`);
			}
		}
	}

	class Graph {
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
			this.edges.forEach(edge => {
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
				nodes: this.nodes.map(element => element.type),
				edges: this.edges,
				node_holes: this.node_holes,
				edge_property: this.edge_property,
			};
		}
	}

	const ElementType = {};
	ElementType.ActiveNode = () => ({
		Node: 'ActiveNode'
	});
	ElementType.AnyNode = () => ({
		Node: 'AnyNode'
	});
	ElementType.MatchedNode = matchPath => ({
		Node: { MatchedNode: matchPath }
	});
	ElementType.Attribute = () => 'Attribute';
	ElementType.Pointer = () => 'Pointer';
	ElementType.Constant = value => ({
		Constant: {
			Primitive: Primitive(value)
		}
	});
	ElementType.NodeConstant = id => ({
		Constant: {
			Node: id
		}
	});

	class Element {
		constructor(type, nodePath, originPath) {
			this.type = type;
			this.nodePath = nodePath;
			this.originPath = originPath;
		}
	}

	const Relation = {};
	Relation.Has = () => 'Has';
	Relation.ChildOf = () => 'ChildOf';
	Relation.With = (srcProperty, dstProperty) => ({With: [srcProperty, dstProperty]});

	const Property = {};
	Property.Name = 'Name';
	Property.Value = 'Value';

	const Primitive = value => {
		let primitive = {String: value};
		if (typeof value === 'boolean') {
			primitive = {Boolean: value};
		} else if (typeof value === 'number') {
			primitive = {Integer: value};  // FIXME: This should probably be a float
		} else {
			// TODO: 
		}

		return primitive;
	};

	/*
	 * A wrapper for element/GME node endpoints
	 */
	class Endpoint {
		constructor(core, node, element) {
			this.core = core;
			this.node = node;
			this.element = element;
		}

		name() {
			return this.core.getAttribute(this.node, 'name');
		}

		getProperty() {
			if (this.name() === 'name') {
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
		constructor(path, attributes={}) {
			this.id = path;
			this.attributes = attributes;
			this.children = [];
			this.pointers = {};  // TODO
		}

		setActiveNode(isActive=true) {
			this.is_active = isActive;
		}

		static async fromNode(core, node) {
			const children = await core.loadChildren(node);
			const attributes = Object.fromEntries(
				core.getOwnAttributeNames(node)
					.map(name => [name, Primitive(core.getAttribute(node, name))])
			);
			const gmeNode = new GMENode(core.getPath(node), attributes);
			gmeNode.children = await Promise.all(children.map(child => GMENode.fromNode(core, child)));
			// TODO: Add pointers, etc
			return gmeNode;
		}
	}

	function partition(list, fn) {
		const result = [[], []];
		list.forEach(item => {
			const index = fn(item) ? 0 : 1;
			result[index].push(item);
		});
		return result;
	}

	function assert(cond, error = new Error("Assert failed")) {
		if (!cond) {
			throw error;
		}
	}

	function getNameValueTupleFor(index, edges) {
		const tuples = new Array(2);
		edges.filter(([,,relation]) => relation.With)
			.forEach(edge => {
				const relation = edge[2];
				const endpointIndex = edge.indexOf(index);
				const otherEndpoint = endpointIndex === 0 ? 1 : 0;
				const nameOrValue = relation.With[endpointIndex];
				if (nameOrValue === Property.Name) {
					tuples[0] = [edge[otherEndpoint], relation.With[otherEndpoint]];
				} else {
					tuples[1] = [edge[otherEndpoint], relation.With[otherEndpoint]];
				}
			});

		return tuples;
	}

	function mapKeys(obj, fn) {
		return Object.fromEntries(
			Object.entries(obj).map(([k, v]) => [fn(k), v])
		);
	}

	class UninstantiableError extends Error {}
	class NoMatchedNodeError extends Error {
		constructor(nodePath) {
			super(`Could not find node created (in previous step) for ${nodePath}`);
			this.nodePath = nodePath;
		}
	}

	class UnimplementedError extends Error {
		constructor(action) {
			super(`${action} not yet supported.`);
			this.action = action;
		}
	}

	Transformation.Pattern = Pattern;
	return Transformation;
});
