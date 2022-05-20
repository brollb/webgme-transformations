// use std::collections::{HashMap, HashSet};
// use std::hash::{Hash, Hasher};

// use petgraph::graph::{Graph, NodeIndex};
// use petgraph::visit::Bfs;

// #[derive(Clone)]
// struct GraphNode {
//     // TODO: attributes need to be first class
//     id: String,
//     types: Vec<String>, // name of all meta nodes up to FCO (and mixins?)
//     is_active: bool,
//     attributes: HashMap<String, String>,
//     pointers: HashMap<String, String>,
//     children: Vec<GraphNode>,
// }

// impl PartialEq for GraphNode {
//     fn eq(&self, other: &Self) -> bool {
//         self.id == other.id
//     }
// }
// impl Eq for GraphNode {}

// impl Hash for GraphNode {
//     fn hash<H: Hasher>(&self, state: &mut H) {
//         self.id.hash(state);
//     }
// }

// #[derive(Clone)]
// enum Element {
//     Node(Node),
//     Primitive(Primitive),
//     Attribute(Attribute),
// }

// #[derive(Clone)]
// struct Attribute;

// #[derive(Clone)]
// enum Node {
//     ActiveNode,
//     AnyNode,
// }

// #[derive(Clone)]
// enum Primitive {
//     Property,
//     Constant, // TODO: everything else needs to be bound
// }

// #[derive(Clone)]
// enum Relation {
//     ChildOf, // btwn nodes
//     With,    // 2 values/attrs
//     Equal,   // btwn nodes or values
// }

// fn is_valid_element(node: &GraphNode, element: &Element) -> bool {
//     match element {
//         Element::Node(ActiveNode) => node.is_active,
//         Element::Node(AnyNode) => true,
//         _ => todo!("attributes, primitives are not yet first class!"),
//     }
// }

// fn is_valid_assignment() -> bool {}

// struct Pattern {
//     graph: Graph<Element, Relation>,
// }

// impl Pattern {
//     pub fn new(graph: Graph<Element, Relation>) -> Self {
//         Pattern { graph }
//     }

//     pub fn find_matches(&self, nodes: Vec<GraphNode>) {
//         // TODO:
//         // for each element in the graph:
//         //    - select an unused assignment that satisfies the relations/constraints
//         //    - recurse
//         // TODO: find one assignment first
//         let assignment: HashMap<GraphNode, NodeIndex> = HashMap::new();

//         let assignment =
//             self.assign_node(&self.graph, self.graph.node_indices(), &nodes, assignment);
//         println!("{:?}", assignment);
//         // let start = self.graph.node_indices().next().unwrap();
//         // let mut bfs = Bfs::new(&self.graph, start);

//         // while let Some(element_index) = bfs.next(&self.graph) {
//         //     // TODO: try to find a valid GraphNode
//         //     let remaining = nodes.iter().filter(|node| !assignment.contains_key(node));
//         //     let locally_valid =
//         //         remaining.filter(|node| is_valid_element(node, &self.graph[element_index]));

//         //     // for each remaining node, find one that is a valid assignment for element_index
//         //     let valid_node = locally_valid
//         //         .find(|node| is_valid_assignment(&self.graph, &assignment, node, element_index));
//         //     if let Some(node) = valid_node {
//         //         assignment.insert(node, element_index);
//         //         // TODO: recurse
//         //     }
//         // TODO: find valid_nodes wrt neighborhood constraints
//     }

//     pub fn assign_node<'a, I>(
//         &self,
//         graph: &Graph<Element, Relation>,
//         // TODO: what element are we assigning?
//         element_indices: I,
//         nodes: &Vec<GraphNode>,
//         partial_match: HashMap<GraphNode, NodeIndex>,
//     ) -> Vec<HashMap<GraphNode, NodeIndex>>
//     where
//         I: Iterator<Item = &'a NodeIndex>,
//     {
//         let element_index = element_indices.next().unwrap();
//         let is_last_assignment = (partial_match.keys().len() + 1) == graph.node_count();
//         let remaining = nodes
//             .iter()
//             .filter(|node| !partial_match.contains_key(node));
//         let locally_valid = remaining.filter(|node| is_valid_element(node, &graph[*element_index]));
//         let valid_nodes = locally_valid
//             .filter(|node| is_valid_assignment(&graph, &partial_match, node, element_index));

//         valid_nodes.flat_map(|node| {
//             let mut updated_match = partial_match.clone();
//             updated_match.insert(*node, *element_index);

//             if is_last_assignment {
//                 return vec![updated_match];
//             } else {
//                 return self.assign_node(graph, element_indices, nodes, updated_match);
//             }
//         });
//         panic!("No valid assignments found!");
//     }

//     // for each unassigned (locally valid) node:
//     //   - if the node assignment doesn't violate any constraints
//     //   - make the assignment:
//     //   - if the assignment is complete, return else recurse!

//     // TODO: make one step of valid assignments
//     // TODO: iterate over each node. Once we find one valid assignment, recurse
// }

// struct PatternMatches {}

// // TODO: create an output pattern

// // mod tests {
// // }
