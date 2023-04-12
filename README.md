# WebGME Transformations

This is an experimental transformation language for defining model
transformations within WebGME.

## Overview

This contains a model transformation language as a metamodel and the
corresponding code to perform the transformations. Transformations output JSON
nodes which can then be instantiated, if desired. (This may not always be the
case if used for visualizers or plugins, for example.)

Transformations contain a series of _steps_ (or ordered _rules_) which are
applied in sequence to the input model. A step contains both an input and output
pattern. (The output pattern is sometimes referred to as a _structure_ since it
can be instantiated and isn't as abstract as a pattern.) The input model is
matched against the input pattern to find valid assignments for all nodes,
pointers, and attributes in the pattern.

For each assignment to the pattern elements, the output pattern is created. The
output pattern can contain references to the input pattern. These are resolved
to the node/attribute/pointer assigned to the element in the input pattern and
are different when multiple valid assignments are found.

When creating transformations with complex relationships, it can be helpful to
first create nodes and then defined relationships between them in a subsequent
rule. To this end, the `origin` pointer can be set from an element of an output
pattern to the element it corresponds to in the input pattern. This designates
that the output node corresponds to the matched node from the input pattern. To
refer to this newly created node in later steps, the `MatchedNode` element can
be used.

## Quick Start

This is a webgme app and can be run accordingly. First, run MongoDB locally and
install the dependencies with `npm install`. Then run `npm start` in the project
root to start the server.

## Code Organization

The main code layout is given below:

- `src/common/ModelTransformation.ts`: Class used to perform a model
  transformation from an instance model of a transformation (and input model) in
  WebGME.
- `src/common/TransformationObserver.ts`: Observer to track an input model and
  transformation definition. Callback will be called with the new model whenever
  either is updated.
- `src/engine/crates/engine`: Pattern matching engine (written in Rust).
- `src/engine/crates/engine-js`: Engine with wrappers and API for compiling to
  wasm.
- `src/plugins/ApplyModelTransformation`: Plugin to apply a model transformation
  and download the output model as JSON.
