mod assignment;
mod core;
mod error;
mod gme;
mod pattern;

use std::rc::Rc;

use assignment::{Assignment, Reference};
use gme::find_with_id;
use pattern::{Element, Node, Pattern, Relation};
use petgraph::{graph::NodeIndex, visit::EdgeRef, Direction};

fn is_valid_target(
    pattern: &Pattern,
    assignment: &Assignment,
    top_node: &gme::Node,
    gme_ref: &Reference,
    element_idx: NodeIndex,
) -> bool {
    // TODO: get all the constraints and evaluate them
    let incoming_rels = pattern
        .graph
        .edges_directed(element_idx, Direction::Incoming)
        .filter_map(|e| {
            let node_index = e.source();
            assignment
                .matches
                .get(&node_index)
                .map(|src_ref| (e.weight(), src_ref, gme_ref))
        });

    let outgoing_rels = pattern
        .graph
        .edges_directed(element_idx, Direction::Outgoing)
        .filter_map(|e| {
            let node_index = e.target();
            assignment
                .matches
                .get(&node_index)
                .map(|dst_ref| (e.weight(), gme_ref, dst_ref))
        });

    let mut relations = incoming_rels.chain(outgoing_rels);
    println!(
        "\nFound {} constraints on {:?} (as {:?}) -- {:?}",
        relations.clone().count(),
        gme_ref,
        element_idx,
        assignment
    );
    let violation = relations.find(|(relation, src, dst)| !relation.is_valid(top_node, src, dst));

    violation.is_none()
}

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

            // TODO: grab all the relations that need to be enforced
            Box::new(
                candidates
                    .into_iter()
                    .filter(move |gme_node| match node {
                        Node::ActiveNode => gme_node.is_active,
                        _ => true,
                    })
                    .filter_map(move |node| {
                        let gme_ref = Reference::Node(node.id.clone());
                        if is_valid_target(pattern, assignment, top_node, &gme_ref, element_idx) {
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
            // TODO: get the node then the attributes
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

            // FIXME: apply the constraints
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

            println!(
                "About to get attributes from {} candidates",
                candidates.len()
            );
            Box::new(candidates.into_iter().filter_map(move |(node, attr)| {
                let gme_ref = Reference::Attribute(node.id.clone(), attr.clone());
                if is_valid_target(pattern, assignment, &top_node, &gme_ref, element_idx) {
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
        get_valid_targets(pattern, &partial_assignment, node, element_idx.clone())
            .filter(|gme_ref| !partial_assignment.has_target(gme_ref))
            .collect();

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

fn main() {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gme::{AttributeName, NodeId};
    use crate::{
        core::Primitive,
        pattern::{Property, Relation},
    };
    use petgraph::Graph;
    use std::collections::HashMap;
    use std::rc::Rc;

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

    // #[test]
    // fn detect_node_by_attr() {
    //     // Create the pattern
    //     let mut graph = Graph::new();
    //     let active_node = graph.add_node(Node::ActiveNode.into());
    //     let node1 = graph.add_node(Node::AnyNode.into());
    //     graph.add_edge(active_node, node1, Relation::ChildOf);

    //     let node2 = graph.add_node(Attribute()into());
    //     graph.add_edge(active_node, node2, Relation::ChildOf);

    //     let pattern = Pattern::new(graph);
    // }

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

        let attr_name =
            graph.add_node(Element::Constant(Primitive::String(String::from("name"))).into());

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
        let gme_node = gme::Node {
            id: NodeId::new(String::from("/a/d/child")),
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
    }

    #[test]
    fn detect_multiple_attributes() {
        // Create the pattern
        let mut graph = Graph::new();
        let attr = graph.add_node(Element::Attribute.into());
        let attr_name =
            graph.add_node(Element::Constant(Primitive::String(String::from("name"))).into());

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
}
