mod assignment;
mod core;
mod error;
pub mod gme;
pub mod pattern;

use std::{
    cmp::Ordering,
    collections::{HashSet, VecDeque},
    matches,
};

pub use crate::core::Primitive;
pub use assignment::{Assignment, Reference};
use log::{info, warn};
use pattern::{Element, Node, Pattern, Relation};
pub use petgraph;
use petgraph::{graph::NodeIndex, visit::EdgeRef, Direction};

fn get_valid_targets<'a>(
    pattern: &'a Pattern,
    assignment: &'a Assignment,
    top_node: &'a gme::NodeInContext,
    element_idx: NodeIndex,
) -> Box<dyn Iterator<Item = Reference> + 'a> {
    let element = pattern.graph.node_weight(element_idx).unwrap();
    match element {
        Element::Node(node) => {
            // check for a ChildOf relation where this is the source
            let edges = pattern
                .graph
                .edges_directed(element_idx, Direction::Outgoing);

            let mut parent_refs = edges.filter_map(|e| match e.weight() {
                Relation::ChildOf => {
                    let node_index = e.target();
                    assignment.matches.get(&node_index)
                }
                _ => None,
            });
            let parent = parent_refs.next().map(|node_ref| match node_ref {
                Reference::Node(node_id) => top_node.find_with_id(node_id),
                _ => panic!(
                    "Resolved Element::Node to non-gme::Node type: {:?}",
                    node_ref
                ),
            });

            // TODO: If these are references to the same node, this should be ok - don't return []
            if parent_refs.next().is_some() {
                return Box::new(std::iter::empty());
            }

            // If no parent, grab all nodes
            let candidates = if let Some(parent) = parent {
                parent.children().collect()
            } else {
                let mut nodes: Vec<_> = top_node.all_nodes().collect();
                nodes.push(top_node.clone());
                nodes
            };

            Box::new(
                candidates
                    .into_iter()
                    .filter(move |gme_node| match node {
                        Node::ActiveNode => gme_node.data().is_active,
                        _ => true,
                    })
                    .filter_map(move |node| {
                        let gme_ref = Reference::Node(node.data().id.clone());
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
                Reference::Node(node_id) => top_node.find_with_id(node_id),
                _ => panic!(
                    "Resolved Element::Node to non-gme::Node type: {:?}",
                    node_ref
                ),
            });

            // FIXME: return error if multiple nodes are referenced?
            if node_refs.next().is_some() {
                return Box::new(std::iter::empty());
            }

            // apply the constraints
            let candidates: Vec<_> = if let Some(node) = node {
                node.data()
                    .attributes
                    .keys()
                    .map(|attr| (node.clone(), attr.clone()))
                    .collect()
            } else {
                let top_attrs = top_node
                    .data()
                    .attributes
                    .keys()
                    .map(|attr| (top_node.clone(), attr.clone()));
                let desc_attrs = top_node.all_nodes().flat_map(|node| {
                    node.data()
                        .attributes
                        .keys()
                        .map(|attr| (node.clone(), attr.clone()))
                        .collect::<Vec<_>>()
                        .into_iter()
                });

                top_attrs.chain(desc_attrs).collect()
            };

            Box::new(candidates.into_iter().filter_map(move |(node, attr)| {
                let gme_ref = Reference::Attribute(node.data().id.clone(), attr);
                if assignment.is_valid_target(pattern, top_node, element_idx, &gme_ref) {
                    Some(gme_ref)
                } else {
                    warn!("target is invalid {:?}", &gme_ref);
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
                Reference::Node(node_id) => top_node.find_with_id(node_id),
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
                node.pointers()
                    .map(|(pointer, _)| (node.clone(), pointer.clone()))
                    .collect()
            } else {
                let top_ptrs = top_node
                    .pointers()
                    .map(|(pointer, _)| (top_node.clone(), pointer.clone()));
                let desc_ptrs = top_node.all_nodes().flat_map(|node| {
                    node.pointers()
                        .map(|(pointer, _)| (node.clone(), pointer.clone()))
                        .collect::<Vec<_>>()
                });

                top_ptrs.chain(desc_ptrs).collect()
            };

            Box::new(candidates.into_iter().filter_map(move |(node, pointer)| {
                let gme_ref = Reference::Pointer(node.data().id.clone(), pointer);
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

#[derive(Eq, PartialEq, Debug)]
struct Priority {
    is_active: bool,
    is_node: bool,
    num_constraints: usize, // edges to assigned elements
    num_edges: usize,
}

impl Priority {
    fn new(is_active: bool, is_node: bool, num_constraints: usize, num_edges: usize) -> Self {
        Self {
            is_active,
            is_node,
            num_constraints,
            num_edges,
        }
    }
}

impl Ord for Priority {
    fn cmp(&self, other: &Self) -> Ordering {
        if self.is_active != other.is_active {
            self.is_active.cmp(&other.is_active)
        } else if self.is_node != other.is_node {
            self.is_node.cmp(&other.is_node)
        } else if self.num_constraints != other.num_constraints {
            self.num_constraints.cmp(&other.num_constraints)
        } else {
            self.num_edges.cmp(&other.num_edges)
        }
    }
}

impl PartialOrd for Priority {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn element_priority(
    pattern: &Pattern,
    assigned: &HashSet<NodeIndex>,
    index: &NodeIndex,
) -> Priority {
    let element = pattern.graph.node_weight(*index).unwrap();
    let is_active = matches!(element, Element::Node(Node::ActiveNode));
    let is_node = matches!(element, Element::Node(..));

    // Prioritize nodes before attributes
    // prioritize constrained nodes, attributes
    // For all the nodes, check if they have been added
    // algorithm:
    //   - for each element, compute priority
    //   - add the element with the max to the ordered list
    //   - repeat until all elements removed from the list
    // priority:
    //   - active node
    //   - node > attribute/pointer
    //   - edges to assigned elements
    //   - # of edges

    let num_edges = pattern.graph.neighbors(*index).count();
    let num_constraints = pattern
        .graph
        .neighbors(*index)
        .filter(|n_index| assigned.contains(n_index))
        .count();

    Priority::new(is_active, is_node, num_constraints, num_edges)
}

fn element_search_queue(pattern: &Pattern) -> VecDeque<NodeIndex> {
    let mut remaining_elements = pattern.reference_elements();
    let mut ordered = VecDeque::with_capacity(remaining_elements.len());
    let mut assigned: HashSet<_> = pattern
        .graph
        .node_indices()
        .filter(|id| matches!(pattern.graph[*id], Element::Constant(_)))
        .collect();

    while !remaining_elements.is_empty() {
        let (i, _) = remaining_elements
            .iter()
            .enumerate()
            .max_by_key(|(_index, element)| element_priority(pattern, &assigned, element))
            .unwrap();

        let element = remaining_elements.swap_remove(i);
        ordered.push_back(element);
        assigned.insert(element);
    }

    ordered
}

pub fn find_assignments(node: gme::NodeInContext, pattern: &Pattern) -> Vec<Assignment> {
    let elements = element_search_queue(pattern);
    info!("Search order: {:?}", elements);

    let assignments: HashSet<_> =
        add_match_to_assignment(&node, pattern, Assignment::new(), elements)
            .into_iter()
            .collect();

    assignments.into_iter().collect::<Vec<_>>()
}

fn add_match_to_assignment(
    node: &gme::NodeInContext,
    pattern: &Pattern,
    partial_assignment: Assignment,
    mut remaining_elements: VecDeque<NodeIndex>,
) -> Vec<Assignment> {
    // algorithm for finding all assignments:
    let mut assignments: Vec<_> = Vec::new();

    //  - if no more nodes to assign, return [assignment]
    if remaining_elements.is_empty() {
        return vec![partial_assignment];
    }

    //  - get the next element
    let element_idx = remaining_elements.pop_front().unwrap();

    //    - for each candidate for the pattern element:
    let element_targets: Vec<_> =
        get_valid_targets(pattern, &partial_assignment, node, element_idx).collect();

    info!(
        "Found {} element_targets for {:?}: {:?}",
        element_targets.len(),
        element_idx,
        element_targets
    );

    //      - create a new assignment with the element_target and recurse
    for element_target in element_targets {
        info!("Assigning {:?} to {:?}", &element_idx, &element_target);
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

    #[test]
    fn detect_active_node_child() {
        // Create the pattern
        let active_node = Node::ActiveNode;
        let node = Node::AnyNode;

        let mut graph = Graph::new();
        let active_node = graph.add_node(active_node.into());
        let node = graph.add_node(node.into());
        graph.add_edge(node, active_node, Relation::ChildOf);

        let pattern = Pattern::new(graph);

        // Create the GME node
        let child_idx = gme::NodeIndex(1);
        let nodes = vec![
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![child_idx],
            },
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d/child")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];

        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
        let top_node_id = gme_node.data().id.clone();
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
    fn detect_active_node_child2() {
        let active_node = Node::ActiveNode;
        let node = Node::AnyNode;

        let mut graph = Graph::new();
        let node = graph.add_node(node.into());
        let active_node = graph.add_node(active_node.into());
        graph.add_edge(node, active_node, Relation::ChildOf);

        let pattern = Pattern::new(graph);

        // Create the GME node
        let child_idx = gme::NodeIndex(1);
        let nodes = vec![
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![child_idx],
            },
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d/child")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];

        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);
    }

    #[test]
    fn detect_attrs() {
        let mut graph = Graph::new();
        graph.add_node(Element::Attribute);
        let pattern = Pattern::new(graph);

        // Create the gme context
        let child = gme::NodeIndex(1);
        let child2 = gme::NodeIndex(2);
        let nodes = vec![
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: vec![(
                    AttributeName(String::from("name")),
                    gme::Attribute(Primitive::String(String::from("parent"))),
                )]
                .into_iter()
                .collect::<HashMap<_, _>>(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![child, child2],
            },
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d/child")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: vec![(
                    AttributeName(String::from("attr2")),
                    gme::Attribute(Primitive::String(String::from("child"))),
                )]
                .into_iter()
                .collect::<HashMap<_, _>>(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![],
            },
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d/child2")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: vec![
                    (
                        AttributeName(String::from("attr3")),
                        gme::Attribute(Primitive::String(String::from("child2"))),
                    ),
                    (
                        AttributeName(String::from("attr4")),
                        gme::Attribute(Primitive::String(String::from("some_val"))),
                    ),
                ]
                .into_iter()
                .collect::<HashMap<_, _>>(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];

        let parent = gme::NodeInContext::from_vec(nodes).unwrap();
        let assignments = find_assignments(parent, &pattern);
        assert_eq!(assignments.len(), 4);
    }

    #[test]
    fn detect_node_by_attr() {
        // Create the pattern
        let mut graph = Graph::new();
        let node = graph.add_node(Node::AnyNode.into());
        let attribute = graph.add_node(Element::Attribute);

        let attr_val = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("TargetValue"),
        ))));
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
        let children_idx: Vec<_> = (1..=10).map(gme::NodeIndex).collect();
        let mut nodes = vec![
            gme::Node {
                id: gme::NodeId::new(String::from("/a")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: children_idx,
            },
            gme::Node {
                id: target_id,
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];
        // Add the remaining child nodes
        (2..=10).for_each(|i| {
            let attributes: HashMap<_, _> = vec![(
                AttributeName(String::from("name")),
                gme::Attribute(Primitive::String(format!("Node #{}", i))),
            )]
            .into_iter()
            .collect();

            nodes.push(gme::Node {
                id: gme::NodeId::new(format!("/a/{}", i)),
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            });
        });
        let parent = gme::NodeInContext::from_vec(nodes).unwrap();
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
            gme::Node {
                id: target_id,
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            }
        });
        let decoys = (1..=10).map(|i| {
            let id = gme::NodeId::new(format!("/a/decoy_{}", i));
            let attributes: HashMap<_, _> = vec![(
                AttributeName(String::from("value")),
                gme::Attribute(Primitive::String(String::from("SharedValue"))),
            )]
            .into_iter()
            .collect();
            gme::Node {
                id,
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            }
        });

        let other_children = (1..=10).map(|i| {
            let attributes: HashMap<_, _> = vec![(
                AttributeName(String::from("name")),
                gme::Attribute(Primitive::String(format!("Node #{}", i))),
            )]
            .into_iter()
            .collect();

            gme::Node {
                id: gme::NodeId::new(format!("/a/{}", i)),
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            }
        });
        let child_nodes = targets.chain(decoys).chain(other_children);
        let children: Vec<_> = child_nodes
            .clone()
            .enumerate()
            .map(|(i, _)| gme::NodeIndex(i + 1))
            .collect();
        let parent = gme::Node {
            id: gme::NodeId::new(String::from("/a")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children,
        };
        let nodes: Vec<_> = std::iter::once(parent).chain(child_nodes).collect();
        let parent = gme::NodeInContext::from_vec(nodes).unwrap();
        let assignments = find_assignments(parent, &pattern);
        assert_eq!(assignments.len(), 2);
        assignments.into_iter().for_each(|assgn| {
            let gme_refs = assgn.matches.values();
            let mut attr_ref_count = 0;
            gme_refs.for_each(|gme_ref| {
                if let Reference::Attribute(node_id, attr_name) = gme_ref {
                    attr_ref_count += 1;
                    assert!(node_id.0.contains("target"));
                    assert_eq!(attr_name.0, String::from("name"));
                }
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
        graph.add_edge(node1, active_node, Relation::ChildOf);

        let node2 = graph.add_node(Node::AnyNode.into());
        graph.add_edge(node2, node1, Relation::ChildOf);

        let pattern = Pattern::new(graph);

        // Create the GME nodes
        let child = gme::NodeIndex(1);
        let child2 = gme::NodeIndex(2);
        let gchild = gme::NodeIndex(3);
        let nodes = vec![
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![child, child2],
            },
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d/child")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![gchild],
            },
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d/child2")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
            gme::Node {
                id: gme::NodeId::new(String::from("/a/d/child/GRAND")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];
        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();

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
        let attr = graph.add_node(Element::Attribute);

        let attr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("name"),
        ))));

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
        let gme_node: gme::NodeInContext = gme::Node {
            id: id.clone(),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        }
        .into();
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
        let attr = graph.add_node(Element::Attribute);
        let attr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("name"),
        ))));

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
        let child1_idx = gme::NodeIndex(1);
        let child2_idx = gme::NodeIndex(2);
        let gme_node = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![child1_idx, child2_idx],
        };
        let nodes = vec![gme_node, child1, child2];
        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 3);
    }

    #[test]
    fn detect_pointer_target() {
        let mut graph = Graph::new();
        let ptr = graph.add_node(Element::Pointer);
        let ptr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("src"),
        ))));

        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );

        // Target should be a node with an attribute set to "target"
        let target = graph.add_node(Element::Node(Node::AnyNode));
        let target_attr = graph.add_node(Element::Attribute);
        let target_val = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("target"),
        ))));

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
        let target_idx = gme::NodeIndex(1);
        let child2_idx = gme::NodeIndex(2);

        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("target")));
        attributes.insert(AttributeName(String::from("some_attr")), attr);
        let target = gme::Node {
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
        let pointers: HashMap<_, _> = vec![(PointerName(String::from("src")), target_idx.clone())]
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
            children: vec![target_idx, child2_idx],
        };

        let nodes = vec![gme_node, target, child2];
        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
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
        // Create a pattern for a src pointer to a node /a/d/ptr_tgt
        let mut graph = Graph::new();
        let ptr = graph.add_node(Element::Pointer);
        let ptr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("src"),
        ))));

        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );

        let target_path = String::from("/a/d/ptr_tgt");
        let target_index = graph.add_node(Element::Constant(Constant::Node(NodeId(
            target_path.clone(),
        ))));
        graph.add_edge(
            ptr,
            target_index,
            Relation::With(Property::Value, Property::Value),
        );

        let pattern = Pattern::new(graph);

        // Find a GME node with the given pointer target
        let target_idx = gme::NodeIndex(1);
        let child_idx = gme::NodeIndex(2);
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("target")));
        attributes.insert(AttributeName(String::from("some_attr")), attr);
        let target = gme::Node {
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
        let pointers: HashMap<_, _> = vec![(PointerName(String::from("src")), target_idx.clone())]
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
            children: vec![target_idx, child_idx],
        };

        let nodes = vec![gme_node, target, child2];
        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
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
    fn detect_pointer_origin() {
        // Create a pattern for a node (ie, the origin) with a "test" pointer to another node
        let mut graph = Graph::new();
        let origin = graph.add_node(Element::Node(Node::AnyNode));
        let ptr = graph.add_node(Element::Pointer);
        let ptr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            "test".into(),
        ))));
        let target = graph.add_node(Element::Node(Node::AnyNode));

        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );
        graph.add_edge(origin, ptr, Relation::Has);
        graph.add_edge(
            ptr,
            target,
            Relation::With(Property::Value, Property::Value),
        );
        let pattern = Pattern::new(graph);

        // Create a GME context
        let origin_idx = gme::NodeIndex(1);
        let target_idx = gme::NodeIndex(2);
        let other_idx = gme::NodeIndex(3);
        let origin_pointers: HashMap<_, _> =
            vec![(PointerName(String::from("test")), target_idx.clone())]
                .into_iter()
                .collect();
        let nodes = vec![
            gme::Node {
                id: NodeId::new(String::from("/p")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![origin_idx, target_idx, other_idx],
            },
            gme::Node {
                id: NodeId::new(String::from("/p/e")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: origin_pointers,
                sets: HashMap::new(),
                children: Vec::new(),
            },
            gme::Node {
                id: NodeId::new(String::from("/p/t")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
            gme::Node {
                id: NodeId::new(String::from("/p/o")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];

        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);

        let assgn = assignments.first().unwrap();
        let origin_node = assgn.matches.get(&origin).unwrap();
        if let Reference::Node(NodeId(node_id)) = origin_node {
            assert_eq!(node_id, &"/p/e".to_owned());
        } else {
            panic!("Assigned non-node reference to pointer origin");
        }
    }

    #[test]
    fn detect_pointer_origin_const_target() {
        // Create a pattern for a node (ie, the origin) with a "test" pointer to another node
        let mut graph = Graph::new();
        let attr = graph.add_node(Element::Attribute);
        let attr_val = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("NodeName"),
        ))));
        graph.add_edge(
            attr,
            attr_val,
            Relation::With(Property::Value, Property::Value),
        );

        let ptr = graph.add_node(Element::Pointer);
        let ptr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            "test".into(),
        ))));
        let origin = graph.add_node(Element::Node(Node::AnyNode));
        let target_path = String::from("/p/t");
        let target = graph.add_node(Element::Constant(Constant::Node(NodeId(target_path))));

        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );
        graph.add_edge(origin, ptr, Relation::Has);
        graph.add_edge(
            ptr,
            target,
            Relation::With(Property::Value, Property::Value),
        );
        let pattern = Pattern::new(graph);

        // Create a GME context
        let origin_idx = gme::NodeIndex(1);
        let target_idx = gme::NodeIndex(2);
        let other_idx = gme::NodeIndex(3);

        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("NodeName")));
        attributes.insert(AttributeName(String::from("name")), attr);

        let origin_pointers: HashMap<_, _> =
            vec![(PointerName(String::from("test")), target_idx.clone())]
                .into_iter()
                .collect();
        let nodes = vec![
            gme::Node {
                id: NodeId::new(String::from("/p")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![origin_idx, target_idx, other_idx],
            },
            gme::Node {
                id: NodeId::new(String::from("/p/e")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: origin_pointers,
                sets: HashMap::new(),
                children: Vec::new(),
            },
            gme::Node {
                id: NodeId::new(String::from("/p/t")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
            gme::Node {
                id: NodeId::new(String::from("/p/o")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];

        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);

        let assgn = assignments.first().unwrap();
        let origin_node = assgn.matches.get(&origin).unwrap();
        if let Reference::Node(NodeId(node_id)) = origin_node {
            assert_eq!(node_id, &"/p/e".to_owned());
        } else {
            panic!("Assigned non-node reference to pointer origin");
        }
    }

    #[test]
    fn detect_pointer_external_target() {
        // Check that we can resolve an attribute of a pointer target not contained in the active node
        let mut graph = Graph::new();
        let attr = graph.add_node(Element::Attribute);
        let attr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("name"),
        ))));
        graph.add_edge(
            attr,
            attr_name,
            Relation::With(Property::Name, Property::Value),
        );

        let ptr = graph.add_node(Element::Pointer);
        let ptr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            "test".into(),
        ))));
        graph.add_edge(
            ptr,
            ptr_name,
            Relation::With(Property::Name, Property::Value),
        );

        let origin = graph.add_node(Element::Node(Node::AnyNode));
        graph.add_edge(origin, ptr, Relation::Has);

        let target = graph.add_node(Element::Node(Node::AnyNode));
        graph.add_edge(
            ptr,
            target,
            Relation::With(Property::Value, Property::Value),
        );
        let pattern = Pattern::new(graph);

        // Create a GME context
        let origin_idx = gme::NodeIndex(1);
        let target_idx = gme::NodeIndex(2);

        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("Target!")));
        attributes.insert(AttributeName(String::from("name")), attr);

        let origin_pointers: HashMap<_, _> = vec![(PointerName(String::from("test")), target_idx)]
            .into_iter()
            .collect();
        let nodes = vec![
            gme::Node {
                id: NodeId::new(String::from("/p")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![origin_idx],
            },
            gme::Node {
                id: NodeId::new(String::from("/p/origin")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: origin_pointers,
                sets: HashMap::new(),
                children: Vec::new(),
            },
            gme::Node {
                id: NodeId::new(String::from("/other/parent/target")),
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];

        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
        let assignments = find_assignments(gme_node, &pattern);
        assert_eq!(assignments.len(), 1);
    }

    // #[test]
    // #[ignore]
    // fn detect_pointer_exists() {
    //     let mut graph = Graph::new();
    //     let ptr = graph.add_node(Element::Pointer);
    //     let ptr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
    //         String::from("src"),
    //     ))));

    //     graph.add_edge(
    //         ptr,
    //         ptr_name,
    //         Relation::With(Property::Name, Property::Value),
    //     );

    //     let pattern = Pattern::new(graph);

    //     // Find a GME node with a src pointer (unset)
    //     let mut attributes = HashMap::new();
    //     let attr = gme::Attribute(Primitive::String(String::from("ChildNode1")));
    //     attributes.insert(AttributeName(String::from("name")), attr);
    //     let child1 = gme::Node {
    //         id: NodeId::new(String::from("/a/d/child_1")),
    //         base: None,
    //         is_active: true,
    //         is_meta: false,
    //         attributes,
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: Vec::new(),
    //     };

    //     let mut attributes = HashMap::new();
    //     let attr = gme::Attribute(Primitive::String(String::from("ChildNode2")));
    //     attributes.insert(AttributeName(String::from("name")), attr);
    //     let pointers: HashMap<_, _> = vec![(PointerName(String::from("src")), Weak::new())]
    //         .into_iter()
    //         .collect();
    //     let child2 = gme::Node {
    //         id: NodeId::new(String::from("/a/d/child_2")),
    //         base: None,
    //         is_active: true,
    //         is_meta: false,
    //         attributes,
    //         pointers,
    //         sets: HashMap::new(),
    //         children: Vec::new(),
    //     };
    //     let mut attributes = HashMap::new();
    //     let attr = gme::Attribute(Primitive::String(String::from("NodeName")));
    //     attributes.insert(AttributeName(String::from("name")), attr);
    //     let gme_node = gme::Node {
    //         id: NodeId::new(String::from("/a/d")),
    //         base: None,
    //         is_active: true,
    //         is_meta: false,
    //         attributes,
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: vec![Rc::new(child1), Rc::new(child2)],
    //     };

    //     let assignments = find_assignments(gme_node, &pattern);
    //     assert_eq!(assignments.len(), 1);
    // }
}
