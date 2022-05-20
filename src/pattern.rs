use petgraph::graph::Graph;

#[derive(Clone, Eq, Hash, PartialEq, Debug)]
pub enum Element {
    Node(Node),
    Primitive(Primitive),
    Attribute(Attribute),
}

#[derive(Clone, Eq, Hash, PartialEq, Debug)]
pub struct Attribute;

#[derive(Clone, Eq, Hash, PartialEq, Debug)]
pub enum Node {
    ActiveNode,
    AnyNode,
}

impl From<Node> for Element {
    fn from(node: Node) -> Element {
        Element::Node(node)
    }
}

#[derive(Clone, Eq, Hash, PartialEq, Debug)]
pub enum Primitive {
    Property,
    Constant, // TODO: everything else needs to be bound
}

// These cant be rc since they can have a loop
#[derive(Clone, Eq, Hash, PartialEq, Debug)]
pub enum Relation {
    ChildOf, // btwn nodes
    With,    // 2 values/attrs
    Equal,   // btwn nodes or values
    AreSame,
}

pub struct Pattern {
    graph: Graph<Element, Relation>,
    // elements: Vec<Element>,
}

impl Pattern {
    pub fn new(graph: Graph<Element, Relation>) -> Self {
        Pattern { graph }
    }
    // pub fn new(elements: Vec<Element>, relations: Vec<Relation<'a>>) -> Self {
    //     let graph = Graph::with_capacity(elements.len(), relations.len());
    //     elements.into_iter().map(|e| graph.add_node(e)).collect()
    //     // TODO: add all the elements
    //     Pattern { elements, graph }
    // }

    pub fn reference_elements(&self) -> Vec<&Element> {
        self.graph
            .node_indices()
            .filter_map(|id| match self.graph[id] {
                Element::Primitive(Primitive::Constant) => None,
                _ => Some(&self.graph[id]),
            })
            .collect()
    }
}

// impl Pattern {
//     pub fn new(graph: Graph<Element, Relation>) -> Self {
//         Pattern { graph }
//     }
// }

#[cfg(test)]
mod tests {
    fn node_with_attribute() {
        todo!();
    }
}
