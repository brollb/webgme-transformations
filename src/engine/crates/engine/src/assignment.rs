use std::collections::HashMap;
use std::hash::{Hash, Hasher};

use crate::core::Primitive;
use crate::gme;
use crate::gme::{AttributeName, NodeId, PointerName, SetName};
use crate::pattern::{Constant, Element, Pattern, Property, Relation};
use petgraph::graph::NodeIndex;
use petgraph::visit::EdgeRef;
use petgraph::Direction;
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Hash)]
pub enum Reference {
    Node(NodeId),
    Attribute(NodeId, AttributeName),
    Pointer(NodeId, PointerName),
    Set(NodeId, SetName),
}

#[derive(Debug, Serialize, Eq)]
pub struct Assignment {
    pub matches: HashMap<NodeIndex, Reference>,
}

impl Assignment {
    pub fn new() -> Self {
        Assignment {
            matches: HashMap::new(),
        }
    }

    fn sorted_entries(&self) -> Vec<(&NodeIndex, &Reference)> {
        let mut entries: Vec<_> = self.matches.iter().to_owned().collect();
        entries.sort_unstable_by_key(|(k, _v)| <&NodeIndex>::clone(k));
        entries
    }

    pub fn with(&self, element: NodeIndex, target: Reference) -> Self {
        let mut matches = self.matches.clone();
        matches.insert(element, target);
        Self { matches }
    }

    fn has_target(&self, target: &Reference) -> bool {
        self.matches.values().any(|reference| reference == target)
    }

    pub fn is_valid_target(
        &self,
        pattern: &Pattern,
        top_node: &gme::NodeInContext,
        element_idx: NodeIndex,
        gme_ref: &Reference,
    ) -> bool {
        // First, get all the relationships that don't have missing endpoints
        if self.has_target(gme_ref) {
            return false;
        }

        let incoming_rels = pattern
            .graph
            .edges_directed(element_idx, Direction::Incoming)
            .map(|e| {
                let node_index = e.source();
                (e.weight(), node_index, Direction::Incoming)
            });

        let outgoing_rels = pattern
            .graph
            .edges_directed(element_idx, Direction::Outgoing)
            .map(|e| {
                let node_index = e.target();
                (e.weight(), node_index, Direction::Outgoing)
            });

        let mut relations = incoming_rels.chain(outgoing_rels);
        let violation = relations.find(|(relation, index, dir)| {
            let is_valid = match relation {
                Relation::ChildOf => self
                    .matches
                    .get(index)
                    .map(|other_ref| match dir {
                        Direction::Outgoing => (other_ref, gme_ref),
                        Direction::Incoming => (gme_ref, other_ref),
                    })
                    .map(|(src_ref, dst_ref)| {
                        let src = match src_ref {
                            Reference::Node(src_id) => top_node.find_with_id(src_id),
                            _ => unreachable!(),
                        };
                        let dst_id = match dst_ref {
                            Reference::Node(node_id) => node_id,
                            _ => unreachable!(),
                        };
                        let has_child = src.children().any(|child| &child.data().id == dst_id);

                        has_child
                    })
                    .unwrap_or(true),

                Relation::Has => self
                    .matches
                    .get(index)
                    .map(|other_ref| {
                        let (node_ref, attr_ref) = match dir {
                            Direction::Incoming => (other_ref, gme_ref),
                            Direction::Outgoing => (gme_ref, other_ref),
                        };
                        let node = match node_ref {
                            Reference::Node(node_id) => top_node.find_with_id(node_id),
                            _ => unreachable!(),
                        };
                        match attr_ref {
                            Reference::Attribute(node_id, attr_name) => {
                                node_id == &node.data().id
                                    && node.data().attributes.contains_key(attr_name)
                            }
                            Reference::Pointer(node_id, ptr_name) => {
                                node_id == &node.data().id
                                    && node.data().pointers.contains_key(ptr_name)
                            }
                            _ => unreachable!(),
                        }
                    })
                    .unwrap_or(true),
                Relation::With(src_prop, dst_prop) => {
                    // check that the given gme_ref's name or value
                    // matches the (name or value of the) connected node/element
                    let (gme_ref_prop, other_prop) = match dir {
                        Direction::Incoming => (dst_prop, src_prop),
                        Direction::Outgoing => (src_prop, dst_prop),
                    };
                    let gme_ref_val = self.get_ptr_attr_value(top_node, gme_ref, gme_ref_prop);
                    let other_element = &pattern.graph[*index];
                    let other_val = match other_element {
                        Element::Constant(constant) => match constant {
                            Constant::Primitive(prim) => Some(prim.clone()),
                            Constant::Node(node_id) => Some(Primitive::String(node_id.0.clone())),
                        },
                        _ => self.matches.get(index).map(|other_ref| {
                            self.get_ptr_attr_value(top_node, other_ref, other_prop)
                        }),
                    };
                    other_val
                        .map(|other_ref_val| other_ref_val == gme_ref_val)
                        .unwrap_or(true)
                }
                Relation::Equal => {
                    // TODO: Check that the references are equal
                    todo!();
                }
            };
            !is_valid
        });

        violation.is_none()
    }

    fn get_ptr_attr_value(
        &self,
        top_node: &gme::NodeInContext,
        gme_ref: &Reference,
        gme_ref_prop: &Property,
    ) -> Primitive {
        match (gme_ref, gme_ref_prop) {
            (Reference::Attribute(_node_id, attr), Property::Name) => {
                Primitive::String(attr.0.clone())
            }
            (Reference::Attribute(node_id, attr_name), Property::Value) => {
                let node = top_node.find_with_id(node_id);
                node.data().attributes.get(attr_name).unwrap().0.clone()
            }
            (Reference::Pointer(_node_id, name), Property::Name) => {
                Primitive::String(name.0.clone())
            }
            (Reference::Pointer(node_id, name), Property::Value) => {
                let node = top_node.find_with_id(node_id);
                let target = node
                    .pointers()
                    .find(|(pointer, _target)| pointer == &name)
                    .map(|(_pointer, target)| target)
                    .unwrap_or_else(|| {
                        panic!(
                            "Pointer reference set to invalid pointer: {:?} {:?}",
                            &name, node_id
                        )
                    });

                Primitive::String(target.data().id.0.clone())
            }
            (Reference::Node(node_id), Property::Value) => Primitive::String(node_id.0.clone()), // TODO: add set, etc
            _ => unreachable!("With relation can only be with Attribute GME refs"),
        }
    }
}

impl Default for Assignment {
    fn default() -> Self {
        Self::new()
    }
}

impl Hash for Assignment {
    fn hash<H: Hasher>(&self, state: &mut H) {
        // hash the sorted keys and the values in order
        self.sorted_entries().into_iter().for_each(|(k, v)| {
            k.hash(state);
            v.hash(state);
        });
    }
}

impl PartialEq for Assignment {
    fn eq(&self, other: &Self) -> bool {
        self.sorted_entries()
            .into_iter()
            .zip(other.sorted_entries().into_iter())
            .fold(true, |still_eq, ((k, v), (other_k, other_v))| {
                still_eq && k == other_k && v == other_v
            })
    }
}
