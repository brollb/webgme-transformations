use crate::core::Primitive;

use core::str::Split;
use nonempty::NonEmpty;
use std::collections::HashSet;
use std::hash::Hash;
use std::{collections::HashMap, hash::Hasher, rc::Rc};

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct AttributeName(pub String);
#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct PointerName(pub String);
#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct SetName(pub String);
#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct NodeId(pub String);

impl NodeId {
    pub fn new(id: String) -> Self {
        Self(id)
    }

    pub fn relids(&self) -> Split<char> {
        let mut relids = self.0.split('/');
        if !self.0.is_empty() {
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
    pub base: Option<NodeIndex>, // FIXME: should we remove this?
    pub is_active: bool,
    pub is_meta: bool,
    pub attributes: HashMap<AttributeName, Attribute>,
    pub pointers: HashMap<PointerName, NodeIndex>,
    pub sets: HashMap<SetName, HashSet<NodeIndex>>,
    pub children: Vec<NodeIndex>,
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

#[derive(Clone, Debug, PartialEq, Hash, Eq, Deserialize, Serialize)]
pub struct NodeIndex(pub usize);

#[derive(Clone, Debug)]
pub struct NodeInContext {
    index: NodeIndex,
    nodes: Rc<NonEmpty<Node>>,
}

impl NodeInContext {
    pub fn new(index: NodeIndex, nodes: Rc<NonEmpty<Node>>) -> Self {
        // TODO: should we ensure it is valid?
        Self { index, nodes }
    }

    pub fn from_vec(nodes: Vec<Node>) -> Option<Self> {
        let index = NodeIndex(0);
        NonEmpty::from_vec(nodes).map(|nodes| Self {
            index,
            nodes: Rc::new(nodes),
        })
    }

    pub(crate) fn data(&self) -> &Node {
        self.nodes.get(self.index.0).unwrap()
    }

    fn resolve(&self, index: NodeIndex) -> NodeInContext {
        NodeInContext::new(index, self.nodes.clone())
    }

    pub(crate) fn find_with_id(&self, id: &NodeId) -> NodeInContext {
        self.nodes
            .iter()
            .position(|n| id.0.starts_with(&n.id.0))
            .map(|i| self.resolve(NodeIndex(i)))
            .map(|parent| {
                let node = if &parent.data().id == id {
                    parent
                } else {
                    let depth = parent.data().id.relids().count();
                    let relid = id.relids().skip(depth);
                    parent.load_by_path(relid)
                };
                node
            })
            .unwrap_or_else(|| panic!("Could not find node with ID: {:?}", id))
    }

    fn load_by_path<'a>(&self, rel_id: impl Iterator<Item = &'a str>) -> NodeInContext {
        rel_id.fold(self.clone(), |node, rel_id| {
            node.children()
                .find(|child| child.data().id.relid() == rel_id)
                .expect("Could not find child")
        })
    }

    pub(crate) fn children<'a>(&'a self) -> impl Iterator<Item = NodeInContext> + 'a {
        self.data()
            .children
            .iter()
            .map(|idx| self.resolve(idx.clone()))
    }

    pub(crate) fn all_nodes<'a>(&'a self) -> impl Iterator<Item = NodeInContext> + 'a {
        (0..self.nodes.len())
            .map(|index| NodeIndex(index))
            .map(|idx| self.resolve(idx))
        // Box::new(self.children().flat_map(|c| {
        //     // FIXME: this is likely not terribly performant...
        //     let desc: Vec<_> = c.all_nodes().collect();
        //     std::iter::once(c).chain(desc.into_iter())
        // }))
    }

    // pub(crate) fn all_nodes<'a>(&'a self) -> Box<dyn Iterator<Item = NodeInContext> + 'a> {
    // }

    pub(crate) fn pointers<'a>(
        &'a self,
    ) -> impl Iterator<Item = (&PointerName, NodeInContext)> + 'a {
        self.data()
            .pointers
            .iter()
            .map(|(name, idx)| (name, self.resolve(idx.clone())))
    }
}

#[cfg(test)]
impl From<Node> for NodeInContext {
    fn from(node: Node) -> Self {
        assert!(node.children.is_empty());
        NodeInContext::from_vec(vec![node]).unwrap()
    }
}

impl PartialEq for NodeInContext {
    fn eq(&self, other: &Self) -> bool {
        self.data() == other.data()
    }
}
impl Eq for NodeInContext {}

// #[derive(Clone, Debug)]
// struct NodeIterator {
//     idx: Vec<NodeIndex>,
//     nodes: Rc<NonEmpty<Node>>,
// }

#[derive(Clone, Debug, Deserialize)]
pub struct Attribute(pub Primitive);
