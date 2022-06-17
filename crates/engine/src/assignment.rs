use std::collections::HashMap;

use crate::core::Primitive;
use crate::gme;
use crate::gme::{AttributeName, NodeId, PointerName, SetName};
use crate::pattern::{Element, Pattern, Property, Relation};
use petgraph::graph::NodeIndex;
use petgraph::visit::EdgeRef;
use petgraph::Direction;
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum Reference {
    Node(NodeId),
    Attribute(NodeId, AttributeName),
    Pointer(NodeId, PointerName),
    Set(NodeId, SetName),
}

#[derive(Debug, Serialize)]
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

    fn has_target(&self, target: &Reference) -> bool {
        self.matches
            .values()
            .find(|reference| *reference == target)
            .is_some()
    }

    pub fn is_valid_target(
        &self,
        pattern: &Pattern,
        top_node: &gme::Node,
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
                    .get(&index)
                    .map(|other_ref| match dir {
                        Direction::Incoming => (other_ref, gme_ref),
                        Direction::Outgoing => (gme_ref, other_ref),
                    })
                    .map(|(src_ref, dst_ref)| {
                        let src = match src_ref {
                            Reference::Node(src_id) => gme::find_with_id(top_node, &src_id),
                            _ => unreachable!(),
                        };
                        let dst_id = match dst_ref {
                            Reference::Node(node_id) => node_id,
                            _ => unreachable!(),
                        };
                        src.children
                            .iter()
                            .find(|child| &child.id == dst_id)
                            .is_some()
                    })
                    .unwrap_or(true),

                Relation::Has => self
                    .matches
                    .get(&index)
                    .map(|other_ref| {
                        let (node_ref, attr_ref) = match dir {
                            Direction::Incoming => (other_ref, gme_ref),
                            Direction::Outgoing => (gme_ref, other_ref),
                        };
                        let node = match node_ref {
                            Reference::Node(node_id) => gme::find_with_id(top_node, &node_id),
                            _ => unreachable!(),
                        };
                        match attr_ref {
                            Reference::Attribute(node_id, attr_name) => {
                                node_id == &node.id && node.attributes.contains_key(attr_name)
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
                        Element::Constant(prim) => Some(prim.clone()),
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
        top_node: &gme::Node,
        gme_ref: &Reference,
        gme_ref_prop: &Property,
    ) -> Primitive {
        println!("{:?}", gme_ref);
        match (gme_ref, gme_ref_prop) {
            (Reference::Attribute(_node_id, attr), Property::Name) => {
                Primitive::String(attr.0.clone())
            }
            (Reference::Attribute(node_id, attr_name), Property::Value) => {
                let node = gme::find_with_id(top_node, &node_id);
                node.attributes.get(&attr_name).unwrap().0.clone()
            }
            (Reference::Pointer(_node_id, name), Property::Name) => {
                Primitive::String(name.0.clone())
            }
            (Reference::Pointer(node_id, name), Property::Value) => {
                let node = gme::find_with_id(top_node, &node_id);
                let target = node
                    .pointers
                    .get(&name)
                    .expect("Pointer reference set to invalid pointer.")
                    .upgrade()
                    .unwrap();

                Primitive::String(target.id.0.clone())
            }
            (Reference::Node(node_id), Property::Value) => Primitive::String(node_id.0.clone()), // TODO: add set, etc
            _ => unreachable!("With relation can only be with Attribute GME refs"),
        }
    }
}
