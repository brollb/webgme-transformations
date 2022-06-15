// TODO: load the pattern matching engine
define(['./engine/index'], function(engineModule) {
	let enginePromise;
	function getEngine() {
		if (!enginePromise) {
			enginePromise = engineModule.create();
		}
		return enginePromise;
	}
	console.log({engineModule});

	class Transformation {
		constructor() {
			// TODO: We may want to create an interface to use with the core (like Umesh mentioned a while ago) so
			// this can create WJI or GME nodes. Technically, WJI can be imported but this has decent perf overhead.
			// First, we should just see if we can optimize WJI
		}

		apply(activeNode) {
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
		}
	}

	class TransformationStep {
		constructor() {
			// TODO
		}

		static async fromNode(core, node) {
			const children = await core.loadChildren(node);
			const inputNode = children.find(child => core.getAttribute(child, 'name'));
			const inputPattern = await Pattern.fromNode(core, inputNode);

			console.log('loading step for', core.getAttribute(node, 'name'));
		}
	}

	class Pattern {

		static async fromNode(core, node) {
			const relationType = Object.values(core.getAllMetaNodes(node))
				.find(node => core.getAttribute(node, 'name') === 'Relation');
			const isRelation = node => core.isTypeOf(node, relationType);
			const elementNodes = (await core.loadChildren(node))
				.sort((n1, n2) => isRelation(n1) ? 1 : -1);
			const engine = await getEngine();
			console.log({engine});

			const elements = elementNodes.map((node, _index, elements) => {
				if (!isRelation(node)) {
					return Pattern.getElementForNode(engine, core, node);
				} else {
					// TODO: look up the source, destinations
					// TODO: pass them to getRelationElementForNode
					throw new Error('todo!');
				}
			});
			// TODO: for each of the nodes, add it
			// TODO: for each of the relations, add it
		}

		static getElementForNode(engine, core, node) {
			const metaType = core.getAttribute(core.getMetaType(node), 'name');
			switch (metaType) {
				case "ActiveNode":
					return new engine.ActiveNode();
				case "AnyNode":
					return new engine.AnyNode();
				case "Attribute":
					return new engine.Attribute();
				case "Constant":
					const value = core.getAttribute(node, 'value');
					return new engine.Constant(value);
				case "Pointer":
					return new engine.Pointer();
				default:
					throw new Error(`Unknown element type: ${metaType}`);
			}
		}

		static getRelationElementForNode(core, node) {
		}
	}

	return Transformation;
});
