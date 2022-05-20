mod gme;
mod pattern;

use std::{collections::HashMap, rc::Rc};

use pattern::{Element, Node, Pattern, Relation};

fn is_valid_element(node: &gme::Node, element: &Element) -> bool {
    match element {
        Element::Node(Node::ActiveNode) => node.is_active,
        Element::Node(_) => true,
        _ => todo!("attributes, primitives are not yet first class!"),
    }
}
//
type ElementIndex = usize;
fn select_next_element() -> ElementIndex {
    todo!();
}

fn candidates_for() -> Vec<gme::Node> {
    todo!();
}

// fn () -> Vec<String> {
//     todo!();
// }

#[derive(Debug)]
pub struct Assignment {
    matches: HashMap<Element, gme::Node>,
}

impl Assignment {
    pub fn new() -> Self {
        Assignment {
            matches: HashMap::new(),
        }
    }

    pub fn with(&self, element: Element, node: gme::Node) -> Self {
        let mut matches = self.matches.clone();
        matches.insert(element, node);
        Self { matches }
    }
}

pub fn find_assignments(node: &gme::Node, pattern: &Pattern) -> Vec<Assignment> {
    let remaining_elements = pattern.reference_elements();
    add_match_to_assignment(node, pattern, Assignment::new(), remaining_elements)
}

fn add_match_to_assignment(
    node: &gme::Node,
    pattern: &Pattern,
    partial_assignment: Assignment,
    mut remaining_elements: Vec<&Element>,
) -> Vec<Assignment> {
    // algorithm for finding all assignments:
    let assignments: Vec<_> = Vec::new();

    //  - if no more nodes to assign, return [assignment]
    if remaining_elements.len() == 0 {
        return vec![partial_assignment];
    }

    //  - select an unassigned pattern element: (most connections to resolved nodes?)
    let idx = select_next_element();
    let element = remaining_elements.swap_remove(idx);

    //    - for each candidate for the pattern element:
    let candidates = candidates_for();

    //      - create a new assignment with the candidate and recurse
    for candidate in candidates {
        let new_assignment = partial_assignment.with(element.clone(), candidate);
        // TODO: check if we have more assignments to make...
        add_match_to_assignment(node, pattern, new_assignment, remaining_elements.clone());
        //      - concat all the valid assignments
    }

    //    - return all assignments
    assignments
}

fn main() {
    // Create the pattern
    let active_node = Node::ActiveNode;
    let node = Node::AnyNode;
    let edge = Relation::ChildOf(&active_node, &node);
    let pattern = Pattern::new(
        vec![
            pattern::Element::Node(active_node),
            pattern::Element::Node(node),
        ],
        vec![edge],
    );

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
        is_active: true,
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
