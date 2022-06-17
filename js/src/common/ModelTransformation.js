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
			this.steps.reduce(async (refDataP, step) => {
				const refData = await refDataP;
				return refData.concat(step.apply(node, activeNode));
			}, Promise.resolve([]));
			// TODO
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
			this.outputPattern = outputPattern;
		}

		async apply(node, gmeNode) {
			console.log('---> applying step', this.name);
			const matches = await this.pattern.matches(node);
			// TODO: how should these be applied?
			const outputs = await Promise.all(matches.map(
				(match, index) => this.outputPattern.instantiate(this.core, gmeNode, match, index)
			));
			console.log('output of', this.name, JSON.stringify(outputs, null, 2));
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
			const assignments = engine.find_matches(node, this.toEnginePattern());
			return assignments.map(a => mapKeys(a.matches, k => this.nodePaths[k]));
		}

		toEnginePattern() {
			return {graph: this.graph};
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

		// TODO: Check if it can be instantiated
		isInstantiable() {
			throw new Error('todo!');
		}

		async instantiate(core, node, assignments, idPrefix='node') {
			// TODO: make the WJI format for these
			console.log(this.externalRelations);
			const elements = this.getElements().map((element, i) => [element, i]);
			const [nodeElements, otherElements] = partition(elements, ([e, i]) => e.Node);
			const nodeIdFor = index => `@id:${idPrefix}_${index}`;
			const nodes = nodeElements.map(([element, index]) => ({
				id: nodeIdFor(index),
				attributes: {},
				pointers: {},
			}));

			const updateElements = otherElements.filter(([e, i]) => !e.Constant);
			await updateElements.reduce(async (prev, [element, index]) => {
				await prev;
				const [outEdges, inEdges] = this.getRelationsWith(index);
				if (element === 'Attribute' || element === 'Pointer') {
					const [[hasEdge], otherEdges] = partition(inEdges, ([src, dst, relation]) => relation === 'Has');
					assert(
						hasEdge,
						new UninstantiableError(`${element} missing source node ("Has" relation)`)
					);
					const nodeWJI = nodes.find(n => n.id === nodeIdFor(hasEdge[0]));
					const [nameTuple, valueTuple] = getNameValueTupleFor(index, otherEdges.concat(outEdges));
					const rootNode = core.getRoot(node);
					const name = await this.resolveNodeProperty(core, rootNode, assignments, ...nameTuple);
					const targetPath = await this.resolveNodeProperty(core, rootNode, assignments, ...valueTuple);
					console.log('setting', name, 'to', targetPath);
					const field = element === 'Attribute' ? 'attributes' : 'pointers';
					nodeWJI[field][name] = targetPath;
				} else {
					throw new Error(`Unsupported element to instantiate: ${element}`);
				}
			}, Promise.resolve());

			// TODO: for each node, create it
			// TODO: sort the nodes by references?
			console.log('instantiating with', JSON.stringify(assignments));
			return nodes;
		}

		async resolveNodeProperty(core, rootNode, assignments, indexOrNodePath, property) {
			const isNodePath = typeof indexOrNodePath === 'string';
			if (isNodePath) {
				console.log('RECEIVED NODE PATH!!!!', indexOrNodePath, property, assignments);
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
				// TODO: resolve the 
				const element = this.getElements()[indexOrNodePath];
				if (element.Constant?.Primitive) {
					return Object.values(element.Constant.Primitive).pop();
				} else if (element.Constant?.Node) {
					return element.Constant.Node;
				} else {
					console.log(element);
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
					const metaType1 = core.getAttribute(core.getMetaType(n1), 'name');
					if (metaType1 === 'Node') return 1;
					const metaType2 = core.getAttribute(core.getMetaType(n2), 'name');
					if (metaType2 === 'Node') return -1;

					return 0;
				});

			const pattern = new Pattern();

			await elementNodes.reduce(async (prev, node) => {
				await prev;
				if (!isRelation(node)) {
					let metaType = core.getAttribute(core.getMetaType(node), 'name');
					if (metaType === 'Node') {  // Short-hand for AnyNode with a base pointer
						const baseId = core.getPointerPath(node, 'type');
						const nodeElement = Element.AnyNode();
						const pointer = Element.Pointer();
						const ptrName = Element.Constant('base');
						const base = Element.NodeConstant(baseId);
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
						if (metaType === 'MatchedNode') {  // FIXME
							metaType = 'AnyNode';
						}
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
						console.log('cross pattern relation');
						const patternPath = core.getPath(patternNode);
						console.log({src, dst, relation, srcElementIndex, srcPath, patternPath});
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
			switch (metaType) {
				case "ActiveNode":
					return Element.ActiveNode();
				case "AnyNode":
					return Element.AnyNode();
				case "Attribute":
					return Element.Attribute();
				case "Constant":
					const value = core.getAttribute(node, 'value');
					return Element.Constant(value);
				//case "ExistingNode":
					//// TODO: 
					//const id = core.getPath(node);
					//return Element.NodeConstant(id);
				case "Pointer":
					return Element.Pointer();
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
	}

	const Element = {};
	Element.ActiveNode = () => ({
		Node: 'ActiveNode'
	});
	Element.AnyNode = () => ({
		Node: 'AnyNode'
	});
	Element.Attribute = () => 'Attribute';
	Element.Pointer = () => 'Pointer';
	Element.Constant = value => ({
		Constant: {
			Primitive: Primitive(value)
		}
	});
	Element.NodeConstant = id => ({
		Constant: {
			Node: id
		}
	});

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

		getProperty(engine) {
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
	return Transformation;
});
