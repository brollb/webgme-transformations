mod gme;
mod pattern;

use std::collections::HashMap;

use pattern::{Element, Node, Pattern};

fn is_valid_element(node: &gme::Node, element: &Element) -> bool {
    match element {
        Element::Node(Node::ActiveNode) => node.is_active,
        Element::Node(_) => true,
        _ => todo!("attributes, primitives are not yet first class!"),
    }
}

type ElementIndex = usize;
fn select_next_element(
    _pattern: &Pattern,
    _assignment: &Assignment,
    _remaining_elements: &Vec<&Element>,
) -> ElementIndex {
    // TODO: Find the element with the most connections to assigned elements
    0
}

fn candidates_for<'a>(
    node: &'a gme::Node,
    assignment: &Assignment,
    element: &Element,
) -> Vec<&'a gme::Node> {
    // Find all the valid candidates for the given node
    // TODO: Optimize this to prioritize child relations, etc

    let mut nodes = Vec::new();
    if is_valid_element(node, element) && !assignment.has_node(node) {
        nodes.push(node);
    }

    for child in &node.children {
        let child_ref = &*child;
        nodes.append(&mut candidates_for(child_ref, assignment, element));
    }
    nodes
}

#[derive(Debug)]
pub struct Assignment<'a> {
    pub matches: HashMap<Element, &'a gme::Node>,
}

impl<'a> Assignment<'a> {
    pub fn new() -> Self {
        Assignment {
            matches: HashMap::new(),
        }
    }

    pub fn with(&self, element: Element, node: &'a gme::Node) -> Self {
        let mut matches = self.matches.clone();
        matches.insert(element, node);
        Self { matches }
    }

    pub fn has_node(&self, node: &gme::Node) -> bool {
        self.matches.values().find(|n| **n == node).is_some()
    }
}

pub fn find_assignments<'a>(node: &'a gme::Node, pattern: &Pattern) -> Vec<Assignment<'a>> {
    let remaining_elements = pattern.reference_elements();
    add_match_to_assignment(node, pattern, Assignment::new(), remaining_elements)
}

fn add_match_to_assignment<'a>(
    node: &'a gme::Node,
    pattern: &Pattern,
    partial_assignment: Assignment<'a>,
    mut remaining_elements: Vec<&Element>,
) -> Vec<Assignment<'a>> {
    // algorithm for finding all assignments:
    let mut assignments: Vec<_> = Vec::new();

    //  - if no more nodes to assign, return [assignment]
    if remaining_elements.len() == 0 {
        return vec![partial_assignment];
    }

    //  - select an unassigned pattern element: (most connections to resolved nodes?)
    let idx = select_next_element(pattern, &partial_assignment, &remaining_elements);
    let element = remaining_elements.swap_remove(idx);

    //    - for each candidate for the pattern element:
    let candidates = candidates_for(node, &partial_assignment, &element);
    println!("Found {} candidates for {:?}", candidates.len(), element);

    //      - create a new assignment with the candidate and recurse
    for candidate in candidates {
        println!("assigning {:?} to {:?}", element, candidate);
        let new_assignment = partial_assignment.with(element.clone(), candidate);
        assignments.append(&mut add_match_to_assignment(
            node,
            pattern,
            new_assignment,
            remaining_elements.clone(),
        ));
        //      - concat all the valid assignments
    }

    //    - return all assignments
    assignments
}

fn main() {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pattern::Relation;
    use petgraph::Graph;
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
            id: String::from("/a/d/child"),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let gme_node = gme::Node {
            id: String::from("/a/d"),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child)],
        };

        let assignments = find_assignments(&gme_node, &pattern);
        assert_eq!(assignments.len(), 1);

        let assignment = assignments.get(0).unwrap();
        let active_match = assignment
            .matches
            .get(&Element::Node(Node::ActiveNode))
            .expect("Could not find match for active node");
        assert_eq!(gme_node, **active_match);
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
            id: String::from("/a/d/child"),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let child = gme::Node {
            id: String::from("/a/d/child"),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(gchild)],
        };
        let child2 = gme::Node {
            id: String::from("/a/d/child2"),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let gme_node = gme::Node {
            id: String::from("/a/d"),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child), Rc::new(child2)],
        };

        let assignments = find_assignments(&gme_node, &pattern);
        for assignment in &assignments {
            println!("assignment:");
            assignment.matches.iter().for_each(|(element, node)| {
                println!("\t{:?} - {}", element, node.id);
            })
        }
        assert_eq!(assignments.len(), 1);
    }
}
