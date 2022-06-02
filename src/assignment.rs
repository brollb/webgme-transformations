use std::collections::HashMap;
use std::rc::Rc;

use crate::gme;
use crate::gme::{AttributeName, NodeId, PointerName, SetName};
use petgraph::graph::NodeIndex;

#[derive(Debug, Clone, PartialEq)]
pub enum Reference {
    Node(NodeId),
    Attribute(NodeId, AttributeName),
    Pointer(NodeId, PointerName),
    Set(NodeId, SetName),
}

#[derive(Debug)]
pub struct Assignment {
    pub matches: HashMap<NodeIndex, Reference>,
}

impl<'a> Assignment {
    pub fn new() -> Self {
        Assignment {
            matches: HashMap::new(),
        }
    }

    pub fn with(&self, element: NodeIndex, target: Reference) -> Self {
        let mut matches = self.matches.clone();
        matches.insert(element, target);
        Self { matches }
    }

    pub fn has_target(&self, target: &Reference) -> bool {
        println!(
            "?? has value {:?} in {:?}? {}",
            target,
            self.matches.values().collect::<Vec<_>>(),
            self.matches
                .values()
                .find(|reference| *reference == target)
                .is_some()
        );
        self.matches
            .values()
            .find(|reference| *reference == target)
            .is_some()
    }
}
