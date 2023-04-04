# To Do

- make a visualization transformation example
  - maybe for the transformation visualizer itself?

    - features needed:
      - containers
        - https://resources.jointjs.com/demos/container
      - ports
        - https://resources.jointjs.com/tutorial/ports

      - how to validate connections? (represent valid connections in the model)
        - port groups?
        - what about when link creation is ambiguous?
          - generic prompt?

  - how to specify that connections can be made?
    - we could add a read-only flag at the diagram level
    - what if we just check which pairs result in a valid connection?
      - this would reduce the problem to resolving a single pair to a new (data)
        node

  - how to resolve what connection should be made when ports are connected?
    - This can be the same as addressing the general case of nodes to add

  - how to resolve actions on the data model in general?
    - another pattern?
      - "action" container
        - backwards transformation (viz model to data model)

- implementing the pattern matching language
  - use an FSM library?
  - this is straight-forward with linear data types but what about with a graph?

  - it should be pretty similar to standard approaches except driven by the
    state machine
    - we also need to remember the (used) matches since we will support back
      references

  - brainstorming:
    - Pattern.findMatches(node)
    - (partial) PatternAssignment.findMatches(node)

  - algorithm:
    - starting with the most constrained node (active node if it exists)
      - sort the assignments to make?

    - if no more assignments, return the [assignment]
    - select an unassigned node, (bfs order?)
      - if no valid assignments, return an empty list
      - for each candidate:
        - create a new assignment with the candidate assigned and recurse
        - concat all the valid assignments
    - return all assignments

  - data structure:
    - Pattern is a set of `Node`s
      - Nodes have a list of constraints
        - type (node, attribute, etc - implicit)

        - <node> child of <other node>
        - <node> with <attribute>
        - is active node

      - first, initialize all the nodes (and implicit constraints)
      - then, populate all the constraints

  - how to handle multiplicity?
    - greedy?
      - with a toggle?
      - matches may need to be a set for some cases...

  - To Do:
    - [ ] get the basic version working first
    - [ ] create a simple example
      - we already have one - just convert it to a test
        - should we use the webgme-json format?
        - the pattern can use GMENodes (easier for resolving inheritance, too)
        - the match targets should be a different format
          - when they are visualizer nodes, they won't exist in the data model
            since they will be transient

        - convert it to something convenient and human-readable. Should I just
          use GMENodes? { id: path type: 'ActiveNode', } { id: path type:
          'AnyNode', } { id: path type: 'Attribute', children: [ { id: path,
          type: 'name', }, { id: path, type: 'value', } ] } { id: path type:
          'Constant', value: "name" }

          { type: 'with', // TODO: add a more coarse classification? Something
          like "Constraint", "Reference", "MatchElement"? source: AnyNode path
          target: Attribute path } { type: 'with', source: AnyNode path target:
          Attribute path } { type: 'equal', source: Property path target:
          PropertyOrConstant path } { type: 'equal', source: Property path
          target: PropertyOrConstant path }
