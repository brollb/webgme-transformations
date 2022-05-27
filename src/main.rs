mod core;
mod gme;
mod pattern;

use std::collections::HashMap;

use gme::{AttributeName, NodeId, PointerName, SetName};
use pattern::{Element, Node, Pattern, Relation};
use petgraph::{graph::NodeIndex, visit::EdgeRef, Direction};

fn resolve_node_ref<'a>(node_ref: &Reference, top_node: &'a gme::Node) -> &'a gme::Node {
    todo!();
}

fn is_valid_target(
    pattern: &Pattern,
    assignment: &Assignment,
    gme_node: &gme::Node,
    element_idx: NodeIndex,
) -> bool {
    // TODO: get all the constraints and evaluate them
    //let relations = pattern.graph.edges_directed(
    true
}

fn get_valid_targets<'a>(
    pattern: &'a Pattern,
    assignment: &'a Assignment,
    top_node: &'a gme::Node,
    element_idx: NodeIndex,
) -> Box<dyn Iterator<Item = Reference<'a>> + 'a> {
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
            let parent = parent_refs
                .next()
                .map(|node_ref| resolve_node_ref(&node_ref, top_node));

            if parent_refs.next().is_some() {
                return Box::new(std::iter::empty());
            }

            let candidates = if let Some(parent) = parent {
                Box::new(parent.children.iter())
            } else {
                top_node.descendents()
            };

            Box::new(
                candidates
                    .filter(move |gme_node| match node {
                        Node::ActiveNode => gme_node.is_active,
                        _ => true,
                    })
                    .filter(move |c| is_valid_target(pattern, assignment, c, element_idx))
                    .map(|node| Reference::Node(&node.id)),
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

            // TODO: check for nodes
            let mut owned_nodes = edges.clone().filter(|e| match e.weight() {
                Relation::Has => true,
                _ => false,
            });
            if let Some(owned_node) = owned_nodes.next() {
                let node_index = owned_node.source();
                if let Some(node_ref) = assignment.matches.get(&node_index) {
                    resolve_node_ref(&node_ref, top_node);
                    // TODO: resolve the reference to the node
                    // TODO: get the attribute list
                    todo!();
                } else {
                    todo!();
                }
            }
            // TODO:
            //   - [ ] get all constraints
            //   - [ ] sort (Has) comes first
            println!("finding match for attribute... {:?}", top_node);
            //Some(Reference::Attribute(&node.id, node.attributes.keys()))
            // TODO: check other constraints
            // TODO: check for name being equal to something
            // TODO: If there are no constraints, we will need to list off all possible ones...
            Box::new(std::iter::empty())
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
    0
}

/// Search the node recursively for all valid targets for the given element in the pattern.
/// It also considers the current assignments. If `ChildOf` relations exist to an assigned
/// node, only those children will be considered.
fn search_valid_targets<'a>(
    node: &'a gme::Node,
    pattern: &'a Pattern,
    assignment: &'a Assignment,
    element_idx: &NodeIndex,
) -> Vec<Reference<'a>> {
    // Find all the valid candidates for the given node
    // TODO: Optimize this to prioritize child relations, etc

    // TODO: Find the candidates more intelligently
    // TODO: Check if we have a ChildOf constraint (w/ an assigned parent)

    // First, we need to select based on the type (Node, Attribute, Property, etc)
    // If we have a ChildOf constraint, load the children only
    //    - else load all nodes (not great)
    // after we retrieve our initial set, then filter using the existing constraints

    let mut nodes: Vec<Reference<'a>> =
        get_valid_targets(pattern, assignment, node, element_idx.clone())
            .into_iter()
            .filter(|target| !assignment.has_target(target))
            .collect();

    for child in &node.children {
        let child_ref = &*child;
        nodes.append(&mut search_valid_targets(
            child_ref,
            pattern,
            assignment,
            element_idx,
        ));
    }
    nodes
}

#[derive(Debug, Clone, PartialEq)]
pub enum Reference<'a> {
    Node(&'a NodeId),
    Attribute(&'a NodeId, AttributeName),
    Pointer(&'a NodeId, PointerName),
    Set(&'a NodeId, SetName),
}

//impl Reference {
//pub fn resolve(&self, top_node: gme::Node) ->
//}

#[derive(Debug)]
pub struct Assignment<'a> {
    pub matches: HashMap<NodeIndex, Reference<'a>>,
}

impl<'a> Assignment<'a> {
    pub fn new() -> Self {
        Assignment {
            matches: HashMap::new(),
        }
    }

    pub fn with(&self, element: NodeIndex, target: Reference<'a>) -> Self {
        let mut matches = self.matches.clone();
        matches.insert(element, target);
        Self { matches }
    }

    pub fn has_target(&self, target: &Reference) -> bool {
        self.matches
            .values()
            .find(|reference| *reference == target)
            .is_some()
    }
}

pub fn find_assignments<'a>(node: &'a gme::Node, pattern: &'a Pattern) -> Vec<Assignment<'a>> {
    let remaining_elements = pattern.reference_elements();
    add_match_to_assignment(node, pattern, Assignment::new(), remaining_elements)
}

fn add_match_to_assignment<'a>(
    node: &'a gme::Node,
    pattern: &'a Pattern,
    partial_assignment: Assignment<'a>,
    mut remaining_elements: Vec<NodeIndex>,
) -> Vec<Assignment<'a>> {
    // algorithm for finding all assignments:
    let mut assignments: Vec<_> = Vec::new();

    //  - if no more nodes to assign, return [assignment]
    if remaining_elements.len() == 0 {
        return vec![partial_assignment];
    }

    //  - select an unassigned pattern element: (most connections to resolved nodes?)
    let idx = select_next_element(pattern, &partial_assignment, &remaining_elements);
    let element_idx = remaining_elements.swap_remove(idx);

    //    - for each candidate for the pattern element:
    let element_targets = search_valid_targets(node, pattern, &partial_assignment, &element_idx);
    println!(
        "Found {} element_targets for {:?}",
        element_targets.len(),
        element_idx
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
    use crate::{
        core::Primitive,
        pattern::{Property, Relation},
    };
    use petgraph::Graph;
    use std::rc::Rc;

    // #[test]
    // fn detect_active_node_child() {
    //     // Create the pattern
    //     let active_node = Node::ActiveNode;
    //     let node = Node::AnyNode;

    //     let mut graph = Graph::new();
    //     let active_node = graph.add_node(active_node.into());
    //     let node = graph.add_node(node.into());
    //     graph.add_edge(active_node, node, Relation::ChildOf);

    //     let pattern = Pattern::new(graph);

    //     // Create the GME node
    //     let child = gme::Node {
    //         id: String::from("/a/d/child"),
    //         base: None,
    //         is_active: false,
    //         is_meta: false,
    //         attributes: HashMap::new(),
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: Vec::new(),
    //     };
    //     let gme_node = gme::Node {
    //         id: String::from("/a/d"),
    //         base: None,
    //         is_active: true,
    //         is_meta: false,
    //         attributes: HashMap::new(),
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: vec![Rc::new(child)],
    //     };

    //     let assignments = find_assignments(&gme_node, &pattern);
    //     assert_eq!(assignments.len(), 1);

    //     let assignment = assignments.get(0).unwrap();
    //     let active_match = assignment
    //         .matches
    //         .get(&active_node)
    //         .expect("Could not find match for active node");

    //     match active_match {
    //         Reference::Node(id) => assert_eq!(gme_node.id, *id),
    //         _ => panic!("Did not match active node to a node!"),
    //     }
    // }

    // // #[test]
    // // fn detect_node_by_attr() {
    // //     // Create the pattern
    // //     let mut graph = Graph::new();
    // //     let active_node = graph.add_node(Node::ActiveNode.into());
    // //     let node1 = graph.add_node(Node::AnyNode.into());
    // //     graph.add_edge(active_node, node1, Relation::ChildOf);

    // //     let node2 = graph.add_node(Attribute()into());
    // //     graph.add_edge(active_node, node2, Relation::ChildOf);

    // //     let pattern = Pattern::new(graph);
    // // }

    // #[test]
    // fn detect_node_child_of() {
    //     // Create the pattern
    //     let mut graph = Graph::new();
    //     let active_node = graph.add_node(Node::ActiveNode.into());
    //     let node1 = graph.add_node(Node::AnyNode.into());
    //     graph.add_edge(active_node, node1, Relation::ChildOf);

    //     let node2 = graph.add_node(Node::AnyNode.into());
    //     graph.add_edge(node1, node2, Relation::ChildOf);

    //     let pattern = Pattern::new(graph);

    //     // Create the GME nodes
    //     let gchild = gme::Node {
    //         id: String::from("/a/d/child"),
    //         base: None,
    //         is_active: false,
    //         is_meta: false,
    //         attributes: HashMap::new(),
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: Vec::new(),
    //     };
    //     let child = gme::Node {
    //         id: String::from("/a/d/child"),
    //         base: None,
    //         is_active: false,
    //         is_meta: false,
    //         attributes: HashMap::new(),
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: vec![Rc::new(gchild)],
    //     };
    //     let child2 = gme::Node {
    //         id: String::from("/a/d/child2"),
    //         base: None,
    //         is_active: false,
    //         is_meta: false,
    //         attributes: HashMap::new(),
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: Vec::new(),
    //     };
    //     let gme_node = gme::Node {
    //         id: String::from("/a/d"),
    //         base: None,
    //         is_active: true,
    //         is_meta: false,
    //         attributes: HashMap::new(),
    //         pointers: HashMap::new(),
    //         sets: HashMap::new(),
    //         children: vec![Rc::new(child), Rc::new(child2)],
    //     };

    //     let assignments = find_assignments(&gme_node, &pattern);
    //     for assignment in &assignments {
    //         println!("assignment:");
    //         assignment.matches.iter().for_each(|(element, node)| {
    //             println!("\t{:?} - {:?}", element, node);
    //         })
    //     }
    //     assert_eq!(assignments.len(), 1);
    // }

    #[test]
    fn detect_attribute() {
        // Create the pattern
        let mut graph = Graph::new();
        let active_node = graph.add_node(Node::ActiveNode.into());
        let attr = graph.add_node(Element::Attribute.into());
        graph.add_edge(active_node, attr, Relation::Has);

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
        let attr = Attribute(Primitive::String(String::from("NodeName")));
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
        let assignments = find_assignments(&gme_node, &pattern);
        println!("{:?}", assignments);
        assert_eq!(assignments.len(), 1);
    }
}
