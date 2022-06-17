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

		applyTransformationStep(inputPattern, outputPattern) {
			// TODO: find all valid assignments matching the input pattern:
				// TODO: Convert the input pattern to GME nodes
				// TODO: find assignments (map back to GME node paths)
			// TODO: for each assignment:
				// TODO: create the output pattern using the assignment values
				// TODO: sort the elements -> (parent) nodes -> attributes/pointers/etc
		}

		static async fromNode(core, node) {
			// TODO: load the different steps (patterns)
			const stepNodes = await core.loadChildren(node);
			// TODO: sort by "next" pointer
			console.log('steps:', stepNodes.map(c => [core.getPath(c), core.getAttribute(c, 'name')]))
			const steps = await Promise.all(stepNodes.map(step => TransformationStep.fromNode(core, step)));
			return new Transformation(core, steps);
		}
	}

	class TransformationStep {
		constructor(pattern) {
			this.pattern = pattern;
		}

		async apply(activeNode) {
			const matches = await this.pattern.matches(activeNode);
			console.log('found matches:', JSON.stringify(matches));
			// TODO
		}

		static async fromNode(core, node) {
			const children = await core.loadChildren(node);
			const inputNode = children.find(child => core.getAttribute(child, 'name'));
			const inputPattern = await Pattern.fromNode(core, inputNode);

			console.log('loading step for', core.getAttribute(node, 'name'));
			return new TransformationStep(inputPattern/*, outputStructure*/);
		}
	}

	class Pattern {
		constructor() {
			this.graph = new Graph();
		}

		async matches(node) {
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

		static async fromNode(core, patternNode) {
			const relationType = Object.values(core.getAllMetaNodes(patternNode))
				.find(node => core.getAttribute(node, 'name') === 'Relation');
			const isRelation = node => core.isTypeOf(node, relationType);
			const elementNodes = (await core.loadChildren(patternNode))
				.sort((n1, n2) => isRelation(n1) ? 1 : -1);

			const pattern = new Pattern();
			const engine = await getEngine();
			console.log({engine});

			await elementNodes.reduce(async (prev, node) => {
				await prev;
				if (!isRelation(node)) {
					const element = Pattern.getElementForNode(engine, core, node);
					pattern.addElement(element);
				} else {
					const srcPath = core.getPointerPath(node, 'src');
					const srcIndex = elementNodes.findIndex(n => core.getPath(n) === srcPath);
					const dstPath = core.getPointerPath(node, 'dst');
					const dstIndex = elementNodes.findIndex(n => core.getPath(n) === dstPath);


					const elements = pattern.getElements();
					const src = await Endpoint.from(core, patternNode, srcPath, elements[srcIndex]);
					const dst = await Endpoint.from(core, patternNode, dstPath, elements[dstIndex]);
					const relation = Pattern.getRelationElementForNode(core, node, src, dst);
					// get the index for the element itself (ie, not the port ID)
					const srcElement = Pattern.getChild(core, patternNode, src.node);
					const srcElementIndex = elementNodes.findIndex(node => node === srcElement);
					const dstElement = Pattern.getChild(core, patternNode, dst.node);
					const dstElementIndex = elementNodes.findIndex(node => node === dstElement);
					console.log(srcElementIndex, dstElementIndex, relation);
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

		static getElementForNode(engine, core, node) {
			const metaType = core.getAttribute(core.getMetaType(node), 'name');
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
	Element.Constant = value => {
		return {
			Constant: Primitive(value)
		};
	};

	const Relation = {};
	Relation.Has = () => 'Has';
	Relation.With = (srcProperty, dstProperty) => ({With: [srcProperty, dstProperty]});

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
				return 'Name';
			} else {
				return 'Value';
			}
		}

		static async from(core, aNode, path, element) {
			const rootNode = core.getRoot(aNode);
			const node = await core.loadByPath(rootNode, path);
			return new Endpoint(core, node, element);
		}
	}

	class GMENode {
		constructor(path, attributes={}) {
			this.id = path;
			this.attributes = attributes;
			this.children = [];
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
