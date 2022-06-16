use crate::core::Primitive;

use core::str::Split;
use std::collections::HashSet;
use std::hash::Hash;
use std::rc::Weak;
use std::{collections::HashMap, hash::Hasher, rc::Rc};

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct AttributeName(pub String);
#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct PointerName(String);
#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct SetName(String);
#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct NodeId(pub String);

impl NodeId {
    pub fn new(id: String) -> Self {
        Self(id)
    }

    pub fn relids(&self) -> Split<char> {
        let mut relids = self.0.split('/');
        if self.0.len() > 0 {
            relids.next(); // skip the empty string
        }
        relids
    }

    pub fn relid(&self) -> &str {
        self.relids().rev().next().unwrap()
    }
}

#[derive(Clone, Debug)]
pub struct Node {
    pub id: NodeId,
    pub base: Option<Rc<Node>>,
    pub is_active: bool,
    pub is_meta: bool,
    pub attributes: HashMap<AttributeName, Attribute>,
    pub pointers: HashMap<PointerName, Weak<Node>>,
    pub sets: HashMap<SetName, HashSet<Weak<Node>>>,
    pub children: Vec<Rc<Node>>,
}

// TODO: make an iterator for this
impl Node {
    pub fn descendents<'a>(&'a self) -> Box<dyn Iterator<Item = &Rc<Node>> + 'a> {
        Box::new(
            self.children
                .iter()
                .flat_map(|c| std::iter::once(c).chain(c.descendents())),
        )
    }
}

impl PartialEq for Node {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}
impl Eq for Node {}

impl Hash for Node {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct Attribute(pub Primitive);

pub(crate) fn find_with_id<'a>(top_node: &'a Node, node_id: &NodeId) -> &'a Node {
    let depth = top_node.id.relids().count();
    node_id.relids().skip(depth).fold(top_node, |node, relid| {
        node.children
            .iter()
            .find(|child| child.id.relid() == relid)
            .expect("Could not find child")
    })
}
