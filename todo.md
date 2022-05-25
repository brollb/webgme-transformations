# To Do
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

- let's start with some motivating (simplistic) examples
  - how about a visualizer that converts the data to a (row in a) table
  - the pattern is pretty simple:
    - match a node

- should I start with the data structure question?
  - [x] come up with a representation for webgme nodes
    - can't rely on core (ie, type name)
    - if we have a ref to an attribute, how can we determine the node w/o a backref?
      - weak ref to the parent?
      - record the node ID

- [ ] add attribute pattern test
  - how should we add attributes?

- [ ] add child of test
  - [x] add pattern with child of, child of
  - [x] use node indices instead of elements in matches
  - [ ] check the constraints from the graph (ie, edges to other matched nodes)
    - we should probably add support for attributes first. How?...
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

  - matches should probably be with the NodeIndex, not the Element type itself
  - this will probably break
- [ ] update to iterator instead

- one disappointing thing is that the current Relations are not enforced by types on the graph
