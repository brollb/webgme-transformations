// TODO: load the pattern matching engine
define([], function() {
	class Transformation {
		constructor(core, transformNode) {
			this.core = core;
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

		async fromNode(core, node) {
			// TODO: load the different steps (patterns)
			const steps = await core.loadChildren(core, node);
			console.log(steps.map(c => core.getAttribute(c, 'name')))
		}
	}

	class TransformationStep {
		constructor() {
			// TODO
		}

		async fromNode(core, node) {
		}
	}

	class Pattern {

		async fromNode(core, node) {
			const elementNodes = await core.loadChildren(node);
			// TODO: sort the nodes elements vs relations
			// TODO: for each of the nodes, add it
			// TODO: for each of the relations, add it
		}
	}

	return Transformation;
});
