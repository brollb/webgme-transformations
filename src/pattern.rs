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
pub enum Relation<'a> {
    ChildOf(&'a Node, &'a Node),         // btwn nodes
    With(&'a Node, &'a Attribute),       // 2 values/attrs
    Equal(&'a Primitive, &'a Primitive), // btwn nodes or values
    AreSame(&'a Node, &'a Node),
}

pub struct Pattern<'a> {
    graph: Graph<Element, Relation<'a>>,
    elements: Vec<Element>,
}

impl<'a> Pattern<'_> {
    pub fn new(elements: Vec<Element>, relations: Vec<Relation<'a>>) -> Self {
        let graph = Graph::with_capacity(elements.len(), relations.len());
        //elements.for_each(|e| graph.add_node(e))
        // TODO: add all the elements
        Pattern { elements, graph }
    }
    pub fn reference_elements(&self) -> Vec<&Element> {
        self.elements
            //.clone()
            //.into_iter()
            .iter()
            .filter(|e| match e {
                Element::Primitive(Primitive::Constant) => true,
                _ => false,
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
