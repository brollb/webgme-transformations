use crate::assignment::Reference;
use crate::core::Primitive;
use crate::gme;

use petgraph::graph::{Graph, NodeIndex};
use serde::{Deserialize, Serialize};

#[derive(Clone, Eq, Hash, PartialEq, Debug, Deserialize, Serialize)]
pub enum Element {
    Node(Node),
    Constant(Constant), // everything else needs to be bound
    Attribute,
    Pointer,
}

#[derive(Clone, Eq, Hash, PartialEq, Debug, Deserialize, Serialize)]
pub enum Constant {
    Primitive(Primitive),
    Node(gme::NodeId),
}

impl Element {
    pub fn needs_match(&self) -> bool {
        !matches!(*self, Element::Constant(..))
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
    pub fn is_valid(
        &self,
        top_node: &gme::NodeInContext,
        src: &Reference,
        dst: &Reference,
    ) -> bool {
        match (self, src, dst) {
            (Relation::ChildOf, Reference::Node(src_id), Reference::Node(dst_id)) => {
                let src = top_node.find_with_id(src_id);
                let child = src.children().any(|child| &child.data().id == dst_id);
                child
            }
            (Relation::Has, Reference::Node(id), Reference::Attribute(node_id, name)) => {
                if id == node_id {
                    let node = top_node.find_with_id(node_id);
                    node.data().attributes.keys().any(|n| n == name)
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
            .filter(|id| !matches!(self.graph[*id], Element::Constant(_)))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gme::{AttributeName, NodeId};
    use std::collections::HashMap;

    #[test]
    fn relation_child_of() {
        let child_idx = gme::NodeIndex(1);
        let child_id = NodeId::new(String::from("/a/d/child"));
        let child_ref = Reference::Node(child_id.clone());
        let nodes = vec![
            gme::Node {
                id: NodeId::new(String::from("/a/d")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![child_idx],
            },
            gme::Node {
                id: child_id,
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
        ];
        let parent = gme::NodeInContext::from_vec(nodes).unwrap();
        let parent_ref = Reference::Node(parent.data().id.clone());
        assert!(Relation::ChildOf.is_valid(&parent, &parent_ref, &child_ref));
    }

    #[test]
    fn relation_child_of_fail() {
        let child_idx = gme::NodeIndex(0);
        let child_id = NodeId::new(String::from("/a/d/child"));
        let child_ref = Reference::Node(child_id.clone());
        let nodes = vec![
            gme::Node {
                id: child_id,
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            },
            gme::Node {
                id: NodeId::new(String::from("/a/d")),
                base: None,
                is_active: true,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: vec![child_idx],
            },
        ];
        let parent = gme::NodeInContext::from_vec(nodes).unwrap();
        let parent_ref = Reference::Node(parent.data().id.clone());
        assert!(!Relation::ChildOf.is_valid(&parent, &child_ref, &parent_ref));
    }

    #[test]
    fn relation_has() {
        let mut attributes = HashMap::new();
        let attr = gme::Attribute(Primitive::String(String::from("ChildNode2")));
        let attr_name = AttributeName(String::from("name"));
        attributes.insert(attr_name.clone(), attr);
        let node: gme::NodeInContext = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes,
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        }
        .into();
        let node_ref = Reference::Node(node.data().id.clone());
        let attr_ref = Reference::Attribute(node.data().id.clone(), attr_name);
        assert!(Relation::Has.is_valid(&node, &node_ref, &attr_ref));
    }

    #[test]
    fn relation_has_fail() {
        let node: gme::NodeInContext = gme::Node {
            id: NodeId::new(String::from("/a/d")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        }
        .into();
        let node_ref = Reference::Node(node.data().id.clone());
        let attr_name = AttributeName(String::from("name"));
        let attr_ref = Reference::Attribute(node.data().id.clone(), attr_name);
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
