use std::collections::HashMap;
use std::rc::Rc;

use crate::core::Primitive;
use crate::gme;
use crate::gme::{AttributeName, NodeId, PointerName, SetName};
use crate::pattern::{Element, Pattern, Property, Relation};
use petgraph::graph::NodeIndex;
use petgraph::visit::EdgeRef;
use petgraph::Direction;

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

    fn has_target(&self, target: &Reference) -> bool {
        self.matches
            .values()
            .find(|reference| *reference == target)
            .is_some()
    }

    //fn is_valid_relation(
    //&self,
    //pattern: &Pattern,
    //top_node: &gme::Node,
    //relation: &Relation,
    //gme_ref: &Reference,
    //index: NodeIndex,
    //direction:

    //) -> bool {
    //}

    pub fn is_valid_target(
        &self,
        pattern: &Pattern,
        top_node: &gme::Node,
        element_idx: NodeIndex,
        gme_ref: &Reference,
    ) -> bool {
        // TODO: First, get all the relationships that don't have missing endpoints
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
        let violation = relations
            // TODO: add verification step to pattern at the beginning?
            //let element = &pattern.graph[index];
            //if !element.needs_match() {
            //panic!("Cannot have a child relationship with a constant");
            //}
            .find(|(relation, index, dir)| {
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

                    Relation::Has => {
                        todo!();
                    }
                    Relation::With(src_prop, dst_prop) => {
                        // check that the given gme_ref's name or value
                        // matches the (name or value of the) connected node/element
                        let (gme_ref_prop, other_prop) = match dir {
                            Direction::Incoming => (dst_prop, src_prop),
                            Direction::Outgoing => (src_prop, dst_prop),
                        };
                        let gme_ref_val = self.get_attribute_value(top_node, gme_ref, gme_ref_prop);
                        let other_element = &pattern.graph[*index];
                        let other_val = match other_element {
                            Element::Constant(prim) => Some(prim.clone()),
                            _ => self.matches.get(index).map(|other_ref| {
                                self.get_attribute_value(top_node, other_ref, other_prop)
                            }),
                        };
                        other_val
                            .map(|other_ref_val| other_ref_val == gme_ref_val)
                            .unwrap_or(true)
                    }
                    Relation::Equal => {
                        todo!();
                    }
                };
                !is_valid
            });

        violation.is_none()
    }

    fn get_attribute_value(
        &self,
        top_node: &gme::Node,
        gme_ref: &Reference,
        gme_ref_prop: &Property,
    ) -> Primitive {
        match (gme_ref, gme_ref_prop) {
            (Reference::Attribute(_node_id, attr), Property::Name) => {
                Primitive::String(attr.0.clone())
            }
            (Reference::Attribute(node_id, attr_name), Property::Value) => {
                let node = gme::find_with_id(top_node, &node_id);
                node.attributes.get(&attr_name).unwrap().0.clone()
            } // TODO: add pointer, set, etc
            _ => unreachable!("With relation can only be with Attribute GME refs"),
        }
    }
}
