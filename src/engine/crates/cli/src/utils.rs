use std::collections::{HashMap, HashSet};

use serde::Deserialize;
use webgme_pattern_engine::{gme, Primitive};

#[derive(Debug, Deserialize)]
pub struct GMEContext {
    nodes: Vec<GMENode>,
}

#[derive(Debug, Deserialize)]
pub struct EmptyContextError;

impl TryFrom<GMEContext> for gme::NodeInContext {
    type Error = EmptyContextError;

    fn try_from(context: GMEContext) -> Result<Self, Self::Error> {
        let nodes: Vec<_> = context.nodes.into_iter().map(|node| node.into()).collect();
        // TODO: should we validate the node index values?
        // TODO: should we support sending an index, too?
        gme::NodeInContext::from_vec(nodes).ok_or(EmptyContextError)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GMENode {
    id: String,
    is_active: Option<bool>,
    is_meta: Option<bool>,
    attributes: HashMap<String, Primitive>,
    pointers: HashMap<String, usize>,
    sets: HashMap<String, Vec<usize>>,
    children: Vec<usize>,
}

impl From<GMENode> for gme::Node {
    fn from(node: GMENode) -> Self {
        let attributes: HashMap<_, _> = node
            .attributes
            .into_iter()
            .map(|(name, value)| (gme::AttributeName(name), gme::Attribute(value)))
            .collect();
        let pointers: HashMap<_, _> = node
            .pointers
            .into_iter()
            .map(|(name, index)| {
                let pointer = gme::PointerName(name);
                let node_index = gme::NodeIndex(index);
                (pointer, node_index)
            })
            .collect();
        let children: Vec<_> = node
            .children
            .into_iter()
            .map(|index| gme::NodeIndex(index))
            .collect();
        let sets: HashMap<_, _> = node
            .sets
            .into_iter()
            .map(|(name, idx)| {
                let indices: HashSet<_> =
                    idx.into_iter().map(|index| gme::NodeIndex(index)).collect();
                (gme::SetName(name), indices)
            })
            .collect();

        Self {
            id: gme::NodeId::new(node.id),
            base: pointers
                .get(&gme::PointerName("base".into()))
                .map(|v| v.to_owned()),
            is_active: node.is_active.unwrap_or(false),
            is_meta: node.is_meta.unwrap_or(false),
            attributes,
            pointers,
            sets,
            children,
        }
    }
}
