use crate::assignment::Reference;
use crate::core::Primitive;
use crate::gme;

use petgraph::graph::{Graph, NodeIndex};
use serde::{Deserialize, Serialize};

#[derive(Clone, Eq, Hash, PartialEq, Debug, Deserialize, Serialize)]
pub enum Element {
    Node(Node),
    Constant(Primitive), // everything else needs to be bound
    Attribute,
}

impl Element {
    pub fn needs_match(&self) -> bool {
        match *self {
            Element::Constant(..) => false,
            _ => true,
        }
    }
}

#[derive(Clone, Eq, Hash, PartialEq, Debug, Deserialize, Serialize)]
pub enum Property {
    Name,
    Value,
}

#[derive(Clone, Eq, Hash, PartialEq, Debug, Deserialize, Serialize)]
pub enum Node {
    ActiveNode,
    AnyNode,
}

impl From<Node> for Element {
    fn from(node: Node) -> Element {
        Element::Node(node)
    }
}

#[derive(Clone, Eq, Hash, PartialEq, Debug, Deserialize, Serialize)]
pub enum Relation {
    ChildOf,                  // btwn nodes
    Has,                      // btwn node and attribute
    With(Property, Property), // 2 attributes or constants
    Equal,
}

impl Relation {
    // FIXME: we may need to
    pub fn is_valid(&self, top_node: &gme::Node, src: &Reference, dst: &Reference) -> bool {
        match (self, src, dst) {
            (Relation::ChildOf, Reference::Node(src_id), Reference::Node(dst_id)) => {
                let src = gme::find_with_id(top_node, src_id);
                src.children
                    .iter()
                    .find(|child| &child.id == dst_id)
                    .is_some()
            }
            (Relation::Has, Reference::Node(id), Reference::Attribute(node_id, name)) => {
                if id == node_id {
                    let node = gme::find_with_id(top_node, node_id);
                    node.attributes.keys().find(|n| *n == name).is_some()
                } else {
                    false
                }
            }
            (Relation::Equal, _, _) => src == dst,
            (relation, src, dst) => panic!(
                "{:?} relation found between incompatible graph node types: {:?} -> {:?}",
                relation, src, dst
            ),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
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
    use super::*;
    use crate::gme::{AttributeName, NodeId};
    use std::collections::HashMap;
    use std::rc::Rc;

    #[test]
    fn relation_child_of() {
        let child = gme::Node {
            id: NodeId::new(String::from("/a/d/child")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let child_ref = Reference::Node(child.id.clone());
        let parent = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child)],
        };
        let parent_ref = Reference::Node(parent.id.clone());
        assert!(Relation::ChildOf.is_valid(&parent, &parent_ref, &child_ref));
    }

    #[test]
    fn relation_child_of_fail() {
        let child = gme::Node {
            id: NodeId::new(String::from("/a/d/child")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let child_ref = Reference::Node(child.id.clone());
        let parent = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![Rc::new(child)],
        };
        let parent_ref = Reference::Node(parent.id.clone());
        assert!(!Relation::ChildOf.is_valid(&parent, &child_ref, &parent_ref));
    }

    #[test]
    fn relation_has() {
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode2")));
        let attr_name = AttributeName(String::from("name"));
        attributes.insert(attr_name.clone(), attr);
        let node = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let node_ref = Reference::Node(node.id.clone());
        let attr_ref = Reference::Attribute(node.id.clone(), attr_name);
        assert!(Relation::Has.is_valid(&node, &node_ref, &attr_ref));
    }

    #[test]
    fn relation_has_fail() {
        let node = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        };
        let node_ref = Reference::Node(node.id.clone());
        let attr_name = AttributeName(String::from("name"));
        let attr_ref = Reference::Attribute(node.id.clone(), attr_name);
        assert!(!Relation::Has.is_valid(&node, &node_ref, &attr_ref));
    }

    //#[test]
    //fn relation_with_name_constant() {
    //todo!();
    ////let mut attributes = HashMap::new();
    ////let attr = gme::Attribute(Primitive::String(String::from("SomeNodeName")));
    ////let attr_name = AttributeName(String::from("name"));
    ////attributes.insert(attr_name.clone(), attr);
    ////let node = gme::Node {
    ////id: NodeId::new(String::from("/a/d")),
    ////base: None,
    ////is_active: true,
    ////is_meta: false,
    ////attributes,
    ////pointers: HashMap::new(),
    ////sets: HashMap::new(),
    ////children: Vec::new(),
    ////};
    ////let attr_ref = Reference::Attribute(node.id.clone(), attr_name);
    ////// TODO: define a constant
    ////let constant = Element::Constant(Primitive::String(String::from("name")));
    ////let relation = Relation::With(Property::Name, Property::Value);
    ////assert!(relation.is_valid(&node, &attr_ref, &constant));
    //}

    //#[test]
    //fn relation_with_name_value_constant() {
    //todo!();
    ////let mut attributes = HashMap::new();
    ////let attr = gme::Attribute(Primitive::String(String::from("SomeNodeName")));
    ////let attr_name = AttributeName(String::from("name"));
    ////attributes.insert(attr_name.clone(), attr);
    ////let node = gme::Node {
    ////id: NodeId::new(String::from("/a/d")),
    ////base: None,
    ////is_active: true,
    ////is_meta: false,
    ////attributes,
    ////pointers: HashMap::new(),
    ////sets: HashMap::new(),
    ////children: Vec::new(),
    ////};
    ////let attr_ref = Reference::Attribute(node.id.clone(), attr_name);
    ////// TODO: define a constant
    ////let constant = Element::Constant(Primitive::String(String::from("SomeNodeName")));
    ////let relation = Relation::With(Property::Value, Property::Value);
    ////assert!(relation.is_valid(&node, &constant, &attr_ref));
    //}

    //#[test]
    //fn relation_with_name_fail() {
    //todo!();
    //}

    //#[test]
    //fn relation_with_value() {
    //todo!();
    //}

    //#[test]
    //fn relation_with_value_fail() {
    //todo!();
    //}
}
