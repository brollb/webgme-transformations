mod gme;
mod pattern;

use std::{collections::HashMap, rc::Rc};

use pattern::{Element, Node, Pattern, Relation};
use petgraph::Graph;

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

    // TODO: remove nodes already assigned
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
    matches: HashMap<Element, &'a gme::Node>,
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
        println!("adding partial assignment");
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
        // TODO: check if we have more assignments to make...
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

fn main() {
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
        is_active: true,
        is_meta: false,
        attributes: HashMap::new(),
        pointers: HashMap::new(),
        sets: HashMap::new(),
        children: Vec::new(),
    };
    let gme_node = gme::Node {
        id: String::from("/a/d"),
        base: None,
        is_active: false,
        is_meta: false,
        attributes: HashMap::new(),
        pointers: HashMap::new(),
        sets: HashMap::new(),
        children: vec![Rc::new(child)],
    };

    let assignments = find_assignments(&gme_node, &pattern);
    println!("{:?}", assignments);
    assert_eq!(assignments.len(), 1);
}
