use std::collections::HashSet;
use std::hash::Hash;
use std::rc::Weak;
use std::{collections::HashMap, hash::Hasher, rc::Rc};

use crate::core::Primitive;

#[derive(Clone, Debug)]
pub struct AttributeName(String);
#[derive(Clone, Debug)]
pub struct PointerName(String);
#[derive(Clone, Debug)]
pub struct SetName(String);

#[derive(Clone, Debug)]
pub struct Node {
    pub id: String,
    pub base: Option<Rc<Node>>,
    pub is_active: bool,
    pub is_meta: bool,
    pub attributes: HashMap<AttributeName, Attribute>,
    pub pointers: HashMap<PointerName, Weak<Node>>,
    pub sets: HashMap<SetName, HashSet<Weak<Node>>>,
    pub children: Vec<Rc<Node>>,
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
pub struct Attribute(Primitive);
