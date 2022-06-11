# Overview
- algorithm:
  - determine the search order
    - most constrained elements (ie, with the most resolved neighbors - incl constants)
      - active node > parent nodes > attribute-owning nodes > constrained nodes
  - for each of the nodes in the search order (depth-first):
    - get the candidate targets (coarse-grained)
      - check ChildOf relationship for nodes
      - get parent relationship for attributes
    - filter out candidates that violate some constraints

## Transformation Language
### Output Patterns
- sequence of patterns to apply (manage complexity)
- all nodes should be instantiable
- should be able to ref nodes from earlier matches
    - `ExistingNode`
    - `Node` output type can optionally have a `ref`/`id`/`origin` reference

## To Do
- let's start with some motivating (simplistic) examples
  - how about a visualizer that converts the data to a (row in a) table
  - the pattern is pretty simple:
    - match a node
    - match all attributes of the current node
      - convert them to rows in a table

- [ ] Get a simple transformation going
  - [ ] setup JS interop
    - [-] make the existing types wasm-supported
        - hide it behind a feature flag
        - **wasm_bindgen only supports C-style enums**
    - [ ] how should we actually construct non-trivial GME nodes?
      - it might be nice to just parse the JS objects but not clear exactly how to interact with them in a meaningful way...
          - I think we should do this: https://github.com/rustwasm/wasm-bindgen/issues/964
          - We define GMENode and use serde_json
    - [ ] make a test case
      - [ ] maybe make the test case that finds two nodes with the same name?
      - [ ] should I start writing the transformation language?
        - This would help with the interface...
        - let's do it. it should probably not be tied to a plugin but rather a general utility
    - [ ] should I make it accept (slightly extended) WJI format???
        - is_active & is_meta need to be added
        - IDs need to be resolved to actual values (or passed as dict?)
        - otherwise, that is basically it
        - should the parsing happen on the rust side? Probably so we don't have to do it a bunch
        - [-] what type should I use to accept JSValue dictionaries?
            - JSValue, it seems
        - [ ] how to resolve the ID fields?
            - there is a resolving function in the WJI itself...

  - [ ] maybe this should just be a generic transformation within GME?

- [ ] add support for pointers?

- [ ] add benchmarks (speed up the search by setting order intelligently)

- [ ] update to iterator instead
    - first, let's just implement `matches` for all matches
        - we can update it later to an iterator in JS (if supported)

## Done
- [x] should we flip the get_valid_targets search part? Should it depend on the type of element?
    - Node: search as done accordingly
    - Attribute: if there is an associated node, get it first

    - define iterators over the gme::Node
        - [-] children()
            - this isn't needed since we can just call `.children.iter()`
        - [x] descendents()
            - this would probably be nice to have
        - attributes()
            - probably not needed

    - when resolving Element::Node...
        - check for ChildOf relation (all sources must be identical)
          - if found, return children
        - else, check all descendents
        - return iterator filtered by available constraints
          - we need a method to just check if a given assignment can be made without violating existing constraints
            - add method to Relation to check this?
                - this isn't easy since they may have different signatures :(
                - we could make them `Reference`

    - when resolving Element::Attribute...
        - check for With relation (all sources must be identical)
          - if found, return attribute iterator for it
        - else, get attributes for all nodes
        - return iterator filtered by available constraints
          - we need a method to just check if a given assignment can be made without violating existing constraints
            - add method to Relation to check this?

- best data structure?

  - sets:
    - weak refs
  - member attributes:
  - member registry:

  - children:
    - ref counted
  - pointers:
    - weak refs
    - what about base?
  - pointer_meta:

  - attributes:
  - registry:
    - same as attributes
  - registry:

  - it reminds me a bit of WJI format
    - except the base names need to be known (or at least loaded)
    - we could record base nodes as a separate field (ref counted)

- [x] add attribute pattern test
  - how should we add attributes?

- [x] we should probably add support for attributes first. How?...
  - how can we reference attributes in a node?
    - AttributeRef(node, name)?
    - what if we change the values of the assignment hashmap to be a new type (like NodeRef)?
    
    ```rust
    enum Reference {
      Node(Rc<gme::Node>),
      Attribute(Rc<gme::Node>, AttributeName)
      Pointer(Rc<gme::Node>, PointerName)
      Set(Rc<gme::Node>, SetName)
    }
    ```

    - Should we make a trait that allows them to be referenced? (associated type for the target?)
    - we can just use regular references (no need for Rc)

  - how can we reference an attribute's name, property values?
  - can we add a new relation for Attribute -> Property::Name? (or just use with)
  - what if we added new relations like WithName & WithValue?
    - but this won't let us reference a name as the target of a relation
      - ie, we can't say that 2 different attribute names are equal
    - what if we treated it as properties of the edge (ie, the port)
      - With(AttributeProperty::Name, AttributeProperty::Value)
      - Primitive can probably be updated to:
        ```rust
          enum Primitive {  // not sure where to put this
            String(String),
            Boolean(bool),
            Number(f32),
          }
          
          struct Attribute(Primitive);  // gme.rs
          struct Constant(Primitive);   // pattern.rs
        ```
      - the Attribute pattern

- [x] should I start with the data structure question?
  - [x] come up with a representation for webgme nodes
    - can't rely on core (ie, type name)
    - if we have a ref to an attribute, how can we determine the node w/o a backref?
      - weak ref to the parent?
      - record the node ID

- [x] add child of test
  - [x] add pattern with child of, child of
  - [x] use node indices instead of elements in matches
  - [ ] test is failing...
      - [x] it looks like a node is being assigned multiple times...
  - [ ] check the constraints from the graph (ie, edges to other matched nodes)
      - [ ] get all edges with resolved nodes
      - [ ] call a method on the relation with the source, dst that evaluates it

- [x] matches should probably be with the NodeIndex, not the Element type itself

- one disappointing thing is that the current Relations are not enforced by types on the graph
  - this is actually a perk for Equal :)

- checking relations... We might need to define these on the assignment instead. Then we can check if they are constants or assignable nodes. I think we need something like:
    ```rust
    match relation {
      Relation::ChildOf => match (src_index, target_index) {
        (Reference::Node(src_id), Reference::Node(dst_id)) => {
        },
        _ => panic!(),
      },
      Relation::Has => match (src_index, target_index) {
      // TODO: there is another step where we check that these are assigned...
      // TODO: we can't just ignore edges without defined matches. We need a 
      // helper to determine if they still need assignment
        (Reference::Node(node_id), Reference::Attribute(id, attr_name)) => {
        },
      },
      Relation::Equal => src == dst,
      Relation::With => match (src_index, target_index) {
        Constant
      }
    }
    match (relation, src_index, target_index) {
    }
    ```
    Hmm... It actually depends on the element type. For With, Equal, we may need to compare against a constant (Equal is ref-equal so they would just be false).
  - [x] refactor the validity checking to be part of `Assignment` since it has access to the pattern graph, relation, and assignments

- [x] is it possible that there is a violated constraint not detected by just checking locally?
    - I don't think so since we are eventually resolving everything...

