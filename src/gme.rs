use std::collections::HashSet;
use std::hash::Hash;
use std::rc::Weak;
use std::{collections::HashMap, hash::Hasher, rc::Rc};

use crate::core::Primitive;

#[derive(Clone, Debug, PartialEq, Hash, Eq)]
pub struct AttributeName(pub String);
#[derive(Clone, Debug, PartialEq, Hash, Eq)]
pub struct PointerName(String);
#[derive(Clone, Debug, PartialEq, Hash, Eq)]
pub struct SetName(String);
#[derive(Clone, Debug, PartialEq, Hash, Eq)]
pub struct NodeId(String);

impl NodeId {
    pub fn new(id: String) -> Self {
        Self(id)
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

#[derive(Clone, Debug)]
pub struct Attribute(pub Primitive);
