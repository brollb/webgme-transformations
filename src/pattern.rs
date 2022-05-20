use petgraph::graph::{Graph, NodeIndex};

use crate::core::Primitive;

#[derive(Clone, Eq, Hash, PartialEq, Debug)]
pub enum Element {
    Node(Node),
    Constant(Primitive), // TODO: everything else needs to be bound
    Attribute,
}

#[derive(Clone, Eq, Hash, PartialEq, Debug)]
pub enum Property {
    Name,
    Value,
}

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
pub enum Relation {
    ChildOf,                  // btwn nodes
    Has,                      // btwn node and attribute
    With(Property, Property), // 2 attributes or constants
    Equal,
}

pub struct Pattern {
    pub graph: Graph<Element, Relation>,
}

impl Pattern {
    pub fn new(graph: Graph<Element, Relation>) -> Self {
        Pattern { graph }
    }

    pub fn reference_elements(&self) -> Vec<NodeIndex> {
        self.graph
            .node_indices()
            .filter_map(|id| match self.graph[id] {
                Element::Constant(_) => None,
                _ => Some(id),
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    fn node_with_attribute() {
        todo!();
    }
}
