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
				return step.apply(node);
			}, Promise.resolve());
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
		constructor(name, pattern, outputPattern) {
			this.name = name;
			this.pattern = pattern;
			this.outputPattern = outputPattern;
		}

		async apply(activeNode) {
			console.log('---> applying step', this.name);
			const matches = await this.pattern.matches(activeNode);
			const outputs = matches.map(match => this.outputPattern.instantiate(match));
			// TODO: For each pattern, create the structure
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
			return new TransformationStep(name, inputPattern, outputPattern);
		}
	}

	class Pattern {
		constructor() {
			this.graph = new Graph();
		}

		async matches(node) {  // TODO: it might be nice to make this synchronous instead...
			const engine = await getEngine();
			console.log('(JS) pattern:', JSON.stringify(this));
			return engine.find_matches(node, this);
		}

		addElement(node) {
			return this.graph.addNode(node);
		}

		getElements() {
			return this.graph.nodes.slice();
		}

		addRelation(srcIndex, dstIndex, relation) {
			return this.graph.addEdge(srcIndex, dstIndex, relation);
		}

		// TODO: Check if it can be instantiated
		isInstantiable() {
			throw new Error('todo!');
		}

		instantiate(assignments) {
			// TODO: for each node, create it
			// TODO: sort the nodes by references?
			console.log('instantiating with', assignments);
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
						const nodeIndex = pattern.addElement(nodeElement);  // need to add this element first
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
						pattern.addElement(element);
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
					const srcElement = Pattern.getChild(core, patternNode, src.node);
					const srcElementIndex = elementNodes.findIndex(node => node === srcElement);
					const dstElement = Pattern.getChild(core, patternNode, dst.node);
					const dstElementIndex = elementNodes.findIndex(node => node === dstElement);
					pattern.addRelation(srcElementIndex, dstElementIndex, relation);
				}

			}, Promise.resolve());

			return pattern;
		}

		static getChild(core, parent, node) {
			let child = node;
			while (child && core.getParent(child) !== parent) {
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

	return Transformation;
});
