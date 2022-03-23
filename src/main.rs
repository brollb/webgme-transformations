// TODO:
// Define pattern-matching concepts - like regexp for (GME) graphs

#[derive(Clone, Eq, Hash)]
enum Element {
    Node(Node),
    Primitive(Primitive),
    Attribute(Attribute),
}

#[derive(Clone)]
struct Attribute;

#[derive(Clone)]
enum Node {
    ActiveNode, // TODO: Decompose this further?
    AnyNode,
}

#[derive(Clone)]
enum Primitive {
    Property,
    Constant, // TODO: everything else needs to be bound
}

#[derive(Clone)] // TODO: should these be btwn indices instead?
enum Relation<'a> {
    ChildOf(&'a Node, &'a Node),         // btwn nodes
    With(&'a Node, &'a Attribute),       // 2 values/attrs
    Equal(&'a Primitive, &'a Primitive), // btwn nodes or values
}

struct Pattern<'a> {
    elements: &'a [Element],
    relations: Vec<Relation<'a>>,
}

impl Pattern<'_> {
    // TODO: the relations should only reference things in the elements vector..
    pub fn new(elements: Vec<Element>, relations: Vec<Relation>) -> Self {
        Pattern {
            elements,
            relations,
        }
    }

    // TODO: return an iterator over the assignments
    pub fn find_matches(&self, nodes: Vec<GraphNode>) {
        let assignment: HashMap<Element, GraphNode> = HashMap::new();
        let assignments = vec![assignment];

        self.get_assignments(HashMap::new(), 0, nodes)

        // for element in self.elements {
        //     for node in nodes {
        //         todo!();
        //     }
        // } // FIXME: DFS would be better

        // TODO: find assignments for each of the elements
        // TODO: for each element:
        // TODO:   - select an (unused) assignment that satisfies the relations/implicit constraints
        // TODO:   - recurse with the new partial assignment
    }

    fn get_assignments(
        self,
        partial_match: HashMap<Element, GraphNode>,
        index: usize,
        nodes: &[Node],
    ) -> Vec<HashMap<Element, GraphNode>> {
        let mut assignments = Vec::new();
        if let Some(element) = self.elements.get(index) {
            // TODO: return partial matches with all assignments for this element
            for node in nodes {
                // TODO: remove extra copies
                if self.is_valid_assignment(element, node, partial_match) {
                    let next_match = partial_match.clone();
                    next_match.insert(element, node);
                    // TODO: get a slice that doesn't contain the current node...
                    let remaining_nodes = nodes.split_at()
                    assignments.append(&mut self.get_assignments(next_match, index + 1, nodes));
                }
            }
        } else if partial_match.len() == self.elements.len() {
            assignments.push(partial_match);
        }
        assignments
    }

    // TODO: add a find_one fn (using BFS order?)
    fn is_valid_assignment(
        &self,
        element: Element,
        node: GraphNode,
        partial_match: HashMap<Element, GraphNode>,
    ) -> bool {
        // TODO: get all the relations using element and make sure they are valid
        let constraints = self.relations.iter();
        //.filter(|rel| )

        constraints.fold(true, |is_valid, constraint| is_valid && constraint.validate)
    }

    fn assign(
        self,
        partial_match: HashMap<Element, GraphNode>,
        element: &Element,
        nodes: &Vec<Node>,
    ) -> Option<Node> {
        // TODO: Find a valid assignment for "element"
    }
}

struct PatternMatch {}

impl PatternMatch {
    fn assign(self, element: &Element, nodes: &Vec<Node>) -> Option<Node> {
        // TODO: find a node that satisfies all the constraints of "element"
        todo!();
    }
}

#[derive(Clone)]
struct GraphNode {
    id: String,
    types: Vec<String>,
    is_active: bool,
    attributes: HashMap<String, String>,
    pointers: HashMap<String, String>,
    children: Vec<GraphNode>,
}

// TODO: given a pattern, can we match the occurrences in the graph?
// How should we try to match them? For now, let's just take the simple approach and try to
// perform exhaustive search

use std::collections::HashMap;

fn main() {
    // TODO: Create an example pattern and try to match against a simple example
    let active_node = Node::ActiveNode;
    let node = Node::AnyNode;
    let edge = Relation::ChildOf(&active_node, &node);

    let mut elements = Vec::new();
    elements.push(Element::Node(active_node));

    let pattern = Pattern::new(elements, vec![edge]);
    println!("Hello, world!");
}
