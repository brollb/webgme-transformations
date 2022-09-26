mod assignment;
mod core;
mod error;
pub mod gme;
pub mod pattern;

use std::rc::Rc;

pub use crate::core::Primitive;
pub use assignment::{Assignment, Reference};
use gme::find_with_id;
use pattern::{Element, Node, Pattern, Relation};
use petgraph::{graph::NodeIndex, visit::EdgeRef, Direction};

fn get_valid_targets<'a>(
    pattern: &'a Pattern,
    assignment: &'a Assignment,
    top_node: &'a Rc<gme::Node>,
    element_idx: NodeIndex,
) -> Box<dyn Iterator<Item = Reference> + 'a> {
    let element = pattern.graph.node_weight(element_idx.clone()).expect("");
    match element {
        Element::Node(node) => {
            // check for a ChildOf relation where this is the target
            let edges = pattern
                .graph
                .edges_directed(element_idx, Direction::Incoming);

            let mut parent_refs = edges.filter_map(|e| match e.weight() {
                Relation::ChildOf => {
                    let node_index = e.source();
                    assignment.matches.get(&node_index)
                }
                _ => None,
            });
            let parent = parent_refs.next().map(|node_ref| match node_ref {
                Reference::Node(node_id) => find_with_id(top_node, node_id),
                _ => panic!(
                    "Resolved Element::Node to non-gme::Node type: {:?}",
                    node_ref
                ),
            });

            // TODO: If these are references to the same node, this should be ok - don't return []
            if parent_refs.next().is_some() {
                return Box::new(std::iter::empty());
            }

            // If no parent, grab all descendents
            let candidates = if let Some(parent) = parent {
                parent.children.iter().collect()
            } else {
                let mut descendents: Vec<_> = top_node.descendents().collect();
                descendents.push(top_node);
                descendents
            };

            Box::new(
                candidates
                    .into_iter()
                    .filter(move |gme_node| match node {
                        Node::ActiveNode => gme_node.is_active,
                        _ => true,
                    })
                    .filter_map(move |node| {
                        let gme_ref = Reference::Node(node.id.clone());
                        if assignment.is_valid_target(pattern, top_node, element_idx, &gme_ref) {
                            Some(gme_ref)
                        } else {
                            None
                        }
                    }),
            )
        }
        Element::Attribute => {
            // TODO: check if it specified the origin node
            //  - if so, retrieve the attribute (applying the constraints)
            //  - if not, error for now?
            //    - it probably can be resolved to all node/attribute combos
            let edges = pattern
                .graph
                .edges_directed(element_idx, Direction::Incoming);

            let mut node_refs = edges.filter_map(|e| match e.weight() {
                Relation::Has => {
                    let node_index = e.source();
                    assignment.matches.get(&node_index)
                }
                _ => None,
            });
            let node = node_refs.next().map(|node_ref| match node_ref {
                Reference::Node(node_id) => find_with_id(top_node, node_id),
                _ => panic!(
                    "Resolved Element::Node to non-gme::Node type: {:?}",
                    node_ref
                ),
            });

            if node_refs.next().is_some() {
                return Box::new(std::iter::empty());
            }

            // apply the constraints
            let candidates: Vec<_> = if let Some(node) = node {
                node.attributes
                    .keys()
                    .map(|attr| (Rc::new(node.clone()), attr))
                    .collect()
            } else {
                let top_attrs = top_node
                    .attributes
                    .keys()
                    .map(|attr| (top_node.clone(), attr));
                let desc_attrs = top_node
                    .descendents()
                    .flat_map(|node| node.attributes.keys().map(|attr| (node.clone(), attr)));

                top_attrs.chain(desc_attrs).collect()
            };

            Box::new(candidates.into_iter().filter_map(move |(node, attr)| {
                let gme_ref = Reference::Attribute(node.id.clone(), attr.clone());
                if assignment.is_valid_target(pattern, top_node, element_idx, &gme_ref) {
                    Some(gme_ref)
                } else {
                    None
                }
            }))
        }
        Element::Pointer => {
            let edges = pattern
                .graph
                .edges_directed(element_idx, Direction::Incoming);

            let mut node_refs = edges.filter_map(|e| match e.weight() {
                Relation::Has => {
                    let node_index = e.source();
                    assignment.matches.get(&node_index)
                }
                _ => None,
            });
            let node = node_refs.next().map(|node_ref| match node_ref {
                Reference::Node(node_id) => find_with_id(top_node, node_id),
                _ => panic!(
                    "Resolved Element::Node to non-gme::Node type: {:?}",
                    node_ref
                ),
            });

            if node_refs.next().is_some() {
                return Box::new(std::iter::empty());
            }

            // apply the constraints
            let candidates: Vec<_> = if let Some(node) = node {
                node.pointers
                    .keys()
                    .map(|pointer| (Rc::new(node.clone()), pointer))
                    .collect()
            } else {
                let top_ptrs = top_node
                    .pointers
                    .keys()
                    .map(|pointer| (top_node.clone(), pointer));
                let desc_ptrs = top_node
                    .descendents()
                    .flat_map(|node| node.pointers.keys().map(|pointer| (node.clone(), pointer)));

                top_ptrs.chain(desc_ptrs).collect()
            };

            Box::new(candidates.into_iter().filter_map(move |(node, pointer)| {
                let gme_ref = Reference::Pointer(node.id.clone(), pointer.clone());
                if assignment.is_valid_target(pattern, top_node, element_idx, &gme_ref) {
                    Some(gme_ref)
                } else {
                    None
                }
            }))
        }
        Element::Constant(_) => unreachable!("Constants should not be matched against!"),
    }
}

type ElementIndex = usize;
fn select_next_element(
    _pattern: &Pattern,
    _assignment: &Assignment,
    _remaining_elements: &Vec<NodeIndex>,
) -> ElementIndex {
    // TODO: Find the element with the most connections to assigned elements
    // TODO: Use total edge count as a tie-breaker
    // TODO: Prioritize nodes that are the source of a ChildOf relation?
    // TODO: this could be a toposort step before this entire function
    // we should be able to prioritize the sort using the following criteria:
    //   - active node(s)
    //   - ChildOf edges (to selected indices, then generally)
    //   - other edges (to selected indices, then generally)

    // TODO: If we keep swap_remove, we will need this to be [1, n, n-1, ..., 3, 2] order
    0
}

pub fn find_assignments(node: gme::Node, pattern: &Pattern) -> Vec<Assignment> {
    let remaining_elements = pattern.reference_elements();
    let top_node = Rc::new(node);
    println!("Search order: {:?}", remaining_elements);
    add_match_to_assignment(&top_node, pattern, Assignment::new(), remaining_elements)
}

fn add_match_to_assignment(
    node: &Rc<gme::Node>,
    pattern: &Pattern,
    partial_assignment: Assignment,
    mut remaining_elements: Vec<NodeIndex>,
) -> Vec<Assignment> {
    // algorithm for finding all assignments:
    println!("remaining_elements: {:?}", remaining_elements);
    let mut assignments: Vec<_> = Vec::new();

    //  - if no more nodes to assign, return [assignment]
    if remaining_elements.len() == 0 {
        return vec![partial_assignment];
    }

    //  - select an unassigned pattern element: (most connections to resolved nodes?)
    let idx = select_next_element(pattern, &partial_assignment, &remaining_elements);
    let element_idx = remaining_elements.swap_remove(idx);

    //    - for each candidate for the pattern element:
    let element_targets: Vec<_> =
        get_valid_targets(pattern, &partial_assignment, node, element_idx.clone()).collect();

    println!(
        "Found {} element_targets for {:?}: {:?}",
        element_targets.len(),
        element_idx,
        element_targets
    );

    //      - create a new assignment with the element_target and recurse
    for element_target in element_targets {
        let new_assignment = partial_assignment.with(element_idx, element_target);
        assignments.append(&mut add_match_to_assignment(
            node,
            pattern,
            new_assignment,
            remaining_elements.clone(),
        ));
    }

    //    - return all assignments
    assignments
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gme::{AttributeName, NodeId, PointerName};
    use crate::{
        core::Primitive,
        pattern::{Constant, Property, Relation},
    };
    use petgraph::Graph;
    use std::collections::HashMap;
    use std::rc::Rc;
    use std::rc::Weak;

    #[test]
    fn detect_active_node_child() {
        // Create the pattern
        let active_node = Node::ActiveNode;
        let node = Node::AnyNode;

        let mut graph = Graph::new();
        let active_node = graph.add_node(active_node.into());
        let node = graph.add_node(node.into());
        graph.add_edge(active_node, node, Relation::ChildOf);

        let pattern = Pattern::new(graph);

        // Create the GME node
        let child = gme::Node {
            id: gme::NodeId::new(String::from("/a/d/child")),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let gme_node = gme::Node {
            id: gme::NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child)],
        };

        let top_node_id = gme_node.id.clone();
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);

        let assignment = assignments.get(0).unwrap();
        let active_match = assignment
            .matches
            .get(&active_node)
            .expect("Could not find match for active node");

        match active_match {
            Reference::Node(id) => assert_eq!(top_node_id, *id),
            _ => panic!("Did not match active node to a node!"),
        }
    }

    #[test]
    fn detect_node_by_attr() {
        // Create the pattern
        let mut graph = Graph::new();
        let node = graph.add_node(Node::AnyNode.into());
        let attribute = graph.add_node(Element::Attribute);

        let attr_val = graph.add_node(
            Element::Constant(Constant::Primitive(Primitive::String(String::from(
                "TargetValue",
            ))))
            .into(),
        );
        graph.add_edge(node, attribute, Relation::Has);
        graph.add_edge(
            attribute,
            attr_val,
            Relation::With(Property::Value, Property::Value),
        );

        let pattern = Pattern::new(graph);

        let target_id = gme::NodeId::new(String::from("/a/target"));
        let attributes: HashMap<_, _> = vec![(
            AttributeName(String::from("name")),
            gme::Attribute(Primitive::String(String::from("TargetValue"))),
        )]
        .into_iter()
        .collect();
        let target = gme::Node {
            id: target_id.clone(),
            base: None,
            is_active: false,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let children = (1..=10)
            .map(|i| {
                let attributes: HashMap<_, _> = vec![(
                    AttributeName(String::from("name")),
                    gme::Attribute(Primitive::String(format!("Node #{}", i))),
                )]
                .into_iter()
                .collect();

                Rc::new(gme::Node {
                    id: gme::NodeId::new(format!("/a/{}", i)),
                    base: None,
                    is_active: false,
                    is_meta: false,
                    attributes,
                    pointers: HashMap::new(),
                    sets: HashMap::new(),
                    children: Vec::new(),
                })
            })
            .chain(std::iter::once(Rc::new(target)));
        let parent = gme::Node {
            id: gme::NodeId::new(String::from("/a")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: children.collect(),
        };
        let assignments = find_assignments(parent, &pattern);
        assert_eq!(assignments.len(), 1);
    }

    #[test]
    fn detect_node_shared_name() {
        // Create the pattern
        let mut graph = Graph::new();
        let name_const = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("name"),
        ))));
        let node1 = graph.add_node(Node::AnyNode.into());
        let attribute1 = graph.add_node(Element::Attribute);
        graph.add_edge(node1, attribute1, Relation::Has);
        graph.add_edge(
            attribute1,
            name_const,
            Relation::With(Property::Name, Property::Value),
        );

        let node2 = graph.add_node(Node::AnyNode.into());
        let attribute2 = graph.add_node(Element::Attribute);
        graph.add_edge(node2, attribute2, Relation::Has);
        graph.add_edge(
            attribute2,
            name_const,
            Relation::With(Property::Name, Property::Value),
        );

        graph.add_edge(
            attribute1,
            attribute2,
            Relation::With(Property::Value, Property::Value),
        );
        let pattern = Pattern::new(graph);

        // TODO: make a bunch of nodes and detect the ones that have the same name
        // TODO: add nodes that would match if using a different attribute name

        let targets = (1..=2).map(|i| {
            let target_id = gme::NodeId::new(format!("/a/target_{}", i));
            let attributes: HashMap<_, _> = vec![(
                AttributeName(String::from("name")),
                gme::Attribute(Primitive::String(String::from("SharedName"))),
            )]
            .into_iter()
            .collect();
            Rc::new(gme::Node {
                id: target_id.clone(),
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            })
        });
        let decoys = (1..=10).map(|i| {
            let id = gme::NodeId::new(format!("/a/decoy_{}", i));
            let attributes: HashMap<_, _> = vec![(
                AttributeName(String::from("value")),
                gme::Attribute(Primitive::String(String::from("SharedValue"))),
            )]
            .into_iter()
            .collect();
            Rc::new(gme::Node {
                id,
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            })
        });

        let children = (1..=10)
            .map(|i| {
                let attributes: HashMap<_, _> = vec![(
                    AttributeName(String::from("name")),
                    gme::Attribute(Primitive::String(format!("Node #{}", i))),
                )]
                .into_iter()
                .collect();

                Rc::new(gme::Node {
                    id: gme::NodeId::new(format!("/a/{}", i)),
                    base: None,
                    is_active: false,
                    is_meta: false,
                    attributes,
                    pointers: HashMap::new(),
                    sets: HashMap::new(),
                    children: Vec::new(),
                })
            })
            .chain(targets)
            .chain(decoys);
        let parent = gme::Node {
            id: gme::NodeId::new(String::from("/a")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: children.collect(),
        };
        let assignments = find_assignments(parent, &pattern);
        assert_eq!(assignments.len(), 2);
        assignments.into_iter().for_each(|assgn| {
            let gme_refs = assgn.matches.values().into_iter();
            let mut attr_ref_count = 0;
            gme_refs.for_each(|gme_ref| match gme_ref {
                Reference::Attribute(node_id, attr_name) => {
                    attr_ref_count += 1;
                    assert!(node_id.0.contains("target"));
                    assert_eq!(attr_name.0, String::from("name"));
                }
                _ => {}
            });
            assert_eq!(attr_ref_count, 2);
        });
    }

    #[test]
    fn detect_node_child_of() {
        // Create the pattern
        let mut graph = Graph::new();
        let active_node = graph.add_node(Node::ActiveNode.into());
        let node1 = graph.add_node(Node::AnyNode.into());
        graph.add_edge(active_node, node1, Relation::ChildOf);

        let node2 = graph.add_node(Node::AnyNode.into());
        graph.add_edge(node1, node2, Relation::ChildOf);

        let pattern = Pattern::new(graph);

        // Create the GME nodes
        let gchild = gme::Node {
            id: gme::NodeId::new(String::from("/a/d/child/GRAND")),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let child = gme::Node {
            id: gme::NodeId::new(String::from("/a/d/child")),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(gchild)],
        };
        let child2 = gme::Node {
            id: gme::NodeId::new(String::from("/a/d/child2")),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let gme_node = gme::Node {
            id: gme::NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child), Rc::new(child2)],
        };

        let assignments = find_assignments(gme_node, &pattern);
        for assignment in &assignments {
            println!("assignment:");
            assignment.matches.iter().for_each(|(element, node)| {
                println!("\t{:?} - {:?}", element, node);
            })
        }
        assert_eq!(assignments.len(), 1);
    }

    #[test]
    fn detect_attribute() {
        // Create the pattern
        let mut graph = Graph::new();
        let attr = graph.add_node(Element::Attribute.into());

        let attr_name = graph.add_node(
            Element::Constant(Constant::Primitive(Primitive::String(String::from("name")))).into(),
        );

        graph.add_edge(
            attr,
            attr_name,
            Relation::With(Property::Name, Property::Value),
        );

        let pattern = Pattern::new(graph);

        // Create the GME node(s)
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("NodeName")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let id = NodeId::new(String::from("/a/d/child"));
        let gme_node = gme::Node {
            id: id.clone(),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);
        let (_, attr) = assignments
            .into_iter()
            .next()
            .unwrap()
            .matches
            .into_iter()
            .next()
            .unwrap();

        match attr {
            Reference::Attribute(node_id, attr_name) => {
                assert_eq!(node_id, id);
                assert_eq!(attr_name.0, String::from("name"));
            }
            _ => panic!("Expected attribute ref but found {:?}", attr),
        };
    }

    #[test]
    fn detect_multiple_attributes() {
        // Create the pattern
        let mut graph = Graph::new();
        let attr = graph.add_node(Element::Attribute.into());
        let attr_name = graph.add_node(
            Element::Constant(Constant::Primitive(Primitive::String(String::from("name")))).into(),
        );

        graph.add_edge(
            attr,
            attr_name,
            Relation::With(Property::Name, Property::Value),
        );

        let pattern = Pattern::new(graph);

        // Create the GME node(s)
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode1")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let child1 = gme::Node {
            id: NodeId::new(String::from("/a/d/child_1")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };

        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode2")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let child2 = gme::Node {
            id: NodeId::new(String::from("/a/d/child_2")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("NodeName")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let gme_node = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child1), Rc::new(child2)],
        };
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 3);
    }

    #[test]
    fn detect_pointer_target() {
        let mut graph = Graph::new();
        let ptr = graph.add_node(Element::Pointer.into());
        let ptr_name = graph.add_node(
            Element::Constant(Constant::Primitive(Primitive::String(String::from("src")))).into(),
        );

        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );

        // Target should be a node with an attribute set to "target"
        let target = graph.add_node(Element::Node(Node::AnyNode).into());
        let target_attr = graph.add_node(Element::Attribute.into());
        let target_val = graph.add_node(
            Element::Constant(Constant::Primitive(Primitive::String(String::from(
                "target",
            ))))
            .into(),
        );

        graph.add_edge(target, target_attr, Relation::Has);
        graph.add_edge(
            target_attr,
            target_val,
            Relation::With(Property::Value, Property::Value),
        );
        graph.add_edge(
            ptr,
            target,
            Relation::With(Property::Value, Property::Value),
        );

        let pattern = Pattern::new(graph);

        // Find a GME node with the given pointer target
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("target")));
        attributes.insert(AttributeName(String::from("some_attr")), attr);
        let child1 = gme::Node {
            id: NodeId::new(String::from("/a/d/ptr_tgt")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };

        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode2")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let target = Rc::new(child1);
        let pointers: HashMap<_, _> =
            vec![(PointerName(String::from("src")), Rc::downgrade(&target))]
                .into_iter()
                .collect();
        let child2 = gme::Node {
            id: NodeId::new(String::from("/a/d/ptr_origin")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers,
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("NodeName")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let gme_node = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![target, Rc::new(child2)],
        };

        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);
        let assignment = assignments.get(0).unwrap();
        match assignment.matches.get(&ptr).unwrap() {
            Reference::Pointer(node_id, name) => {
                assert_eq!(node_id.0, String::from("/a/d/ptr_origin"));
                assert_eq!(name.0, String::from("src"));
            }
            _ => panic!("Incorrect pointer assignment"),
        }
    }

    #[test]
    fn detect_pointer_const_target() {
        let mut graph = Graph::new();
        let ptr = graph.add_node(Element::Pointer.into());
        let ptr_name = graph.add_node(
            Element::Constant(Constant::Primitive(Primitive::String(String::from("src")))).into(),
        );

        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );

        // Target should be a node with an attribute set to "target"
        let target_path = String::from("/a/d/ptr_tgt");
        let target_index =
            graph.add_node(Element::Constant(Constant::Node(NodeId(target_path.clone()))).into());
        graph.add_edge(
            ptr,
            target_index,
            Relation::With(Property::Value, Property::Value),
        );

        let pattern = Pattern::new(graph);

        // Find a GME node with the given pointer target
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("target")));
        attributes.insert(AttributeName(String::from("some_attr")), attr);
        let child1 = gme::Node {
            id: NodeId::new(target_path),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };

        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode2")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let target = Rc::new(child1);
        let pointers: HashMap<_, _> =
            vec![(PointerName(String::from("src")), Rc::downgrade(&target))]
                .into_iter()
                .collect();
        let child2 = gme::Node {
            id: NodeId::new(String::from("/a/d/ptr_origin")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers,
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("NodeName")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let gme_node = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![target, Rc::new(child2)],
        };

        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);
        let assignment = assignments.get(0).unwrap();
        assert_eq!(assignment.matches.get(&target_index), None);
        match assignment.matches.get(&ptr).unwrap() {
            Reference::Pointer(node_id, name) => {
                assert_eq!(node_id.0, String::from("/a/d/ptr_origin"));
                assert_eq!(name.0, String::from("src"));
            }
            _ => panic!("Incorrect pointer assignment"),
        }
    }

    #[test]
    #[ignore]
    fn detect_pointer_exists() {
        let mut graph = Graph::new();
        let ptr = graph.add_node(Element::Pointer.into());
        let ptr_name = graph.add_node(
            Element::Constant(Constant::Primitive(Primitive::String(String::from("src")))).into(),
        );

        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );

        let pattern = Pattern::new(graph);

        // Find a GME node with a src pointer (unset)
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode1")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let child1 = gme::Node {
            id: NodeId::new(String::from("/a/d/child_1")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };

        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode2")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let pointers: HashMap<_, _> = vec![(PointerName(String::from("src")), Weak::new())]
            .into_iter()
            .collect();
        let child2 = gme::Node {
            id: NodeId::new(String::from("/a/d/child_2")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers,
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("NodeName")));
        attributes.insert(AttributeName(String::from("name")), attr);
        let gme_node = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child1), Rc::new(child2)],
        };

        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);
    }
}
