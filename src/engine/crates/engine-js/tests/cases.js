describe('test cases', function() {
  const engineFactory = require('../pkg-es-pack/gme-pattern-engine.min');
  const assert = require('assert');

  let engine;
  before(async () => {
    engine = await engineFactory.create();
  });

  it('should find children', function () {
    const node = {
            "id": "/4",
            "attributes": {},
            "children": [
                {
                    "id": "/4/3",
                    "attributes": {},
                    "children": [],
                    "pointers": {}
                }
            ],
            "pointers": {},
            "is_active": true
        };
        let pattern = {
          "graph": {
              "nodes": [
                  {
                      "Node": "AnyNode"
                  },
                  {
                      "Node": "ActiveNode"
                  }
              ],
              "edges": [
                  [
                      0,
                      1,
                      "ChildOf"
                  ]
              ],
              "node_holes": [],
              "edge_property": "directed"
          }
      };

    const assignments = engine.find_matches(node, pattern, null);

    console.log(assignments)
    assert.equal(assignments.length, 1);
  });
});
