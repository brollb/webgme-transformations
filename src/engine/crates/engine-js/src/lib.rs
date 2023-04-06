mod utils;

use serde::Deserialize;
use std::{cell::RefCell, collections::HashMap, rc::Rc};
use wasm_bindgen::prelude::*;
use webgme_pattern_engine::{find_assignments, gme, pattern, Primitive};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // The `console.log` is quite polymorphic, so we can bind it with multiple
    // signatures. Note that we need to use `js_name` to ensure we always call
    // `log` in JS.
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(a: u32);

    // Multiple arguments too!
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_many(a: &str, b: &str);
}

// In the engine itself, GME nodes include weak refs which cannot be serialized
// with serde. This is a simpler format which can be accepted by serde (and is
// closer to what is used in webgme)
#[wasm_bindgen]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GMENode {
    id: String,
    is_active: Option<bool>,
    is_meta: Option<bool>,
    attributes: HashMap<String, Primitive>,
    pointers: HashMap<String, String>,
    child_ids: Vec<String>,
}

#[wasm_bindgen]
impl GMENode {
    #[wasm_bindgen(constructor)]
    pub fn new(id: String, name: String) -> Self {
        let attributes: HashMap<_, _> = vec![("name".to_owned(), Primitive::String(name))]
            .into_iter()
            .collect();
        Self {
            id,
            is_active: Some(false),
            is_meta: Some(false),
            attributes,
            pointers: HashMap::new(),
            child_ids: Vec::new(),
        }
    }
}

/// Return the reconstructed GME node with ID, `node_id`, with its relationships
/// to others (the inheritance chain, contained children, and pointers)
/// recursively.
fn parse_node(node_id: &str, ref_nodes: &HashMap<String, GMENode>) -> gme::Node {
    // construct the nodes without any references to others
    let mut nodes: HashMap<String, Rc<RefCell<gme::Node>>> = ref_nodes
        .values()
        .map(|node| {
            let attributes: HashMap<gme::AttributeName, gme::Attribute> = node
                .attributes
                .iter()
                .map(|(name, val)| {
                    (
                        gme::AttributeName(name.to_owned()),
                        gme::Attribute(val.to_owned()),
                    )
                })
                .collect();

            (
                node.id.clone(),
                Rc::new(RefCell::new(gme::Node {
                    id: gme::NodeId(node.id.clone()),
                    base: None, // TODO: add support for this
                    is_active: node.is_active.unwrap_or(false),
                    is_meta: node.is_meta.unwrap_or(false),
                    attributes,
                    pointers: HashMap::new(),
                    sets: HashMap::new(), // TODO
                    children: Vec::new(),
                })),
            )
        })
        .collect();

    // add strong references (children, base)
    let rc_refcell = Rc::new(RefCell::new(5));
    let r2 = rc_refcell.clone(); // Rc<RefCell<T>>
    let im_ref = r2.borrow(); // Ref<T>

    nodes.iter().for_each(|(id, node)| {
        let child_ids = ref_nodes
            .get(id)
            .map(|n| n.child_ids.clone())
            .unwrap_or_default();

        child_ids
            .iter()
            .filter_map(|child_id| nodes.get(child_id))
            .for_each(|child_ref| {
                let child = child_ref.clone();
                // I would like to unwrap the refcell
                let c2 = child.borrow();
                // TODO: add a child ref (Rc<gme::Node>) to the list of children
                node.borrow_mut().children.push(c2);
            });
    });

    // add weak refs (pointers)
    // TODO

    todo!("Add relations between nodes and return the main one")
}

#[wasm_bindgen]
pub fn find_matches(node: &JsValue, pattern: &JsValue, referenced_nodes: &JsValue) -> JsValue {
    let node = node.into_serde::<GMENode>();
    let node: GMENode = node.unwrap();
    let pattern = pattern.into_serde::<pattern::Pattern>();
    let pattern = pattern.unwrap();
    let ref_nodes = referenced_nodes
        .into_serde::<HashMap<String, GMENode>>()
        .unwrap();
    let gme_node: gme::Node = parse_node(&node.id, &ref_nodes);
    let assignments = find_assignments(gme_node, &pattern);
    JsValue::from_serde(&assignments).unwrap()
}

#[wasm_bindgen]
pub fn test(pattern: &JsValue, node: &JsValue, referenced_nodes: &JsValue) -> JsValue {
    todo!("Check that there is at least one match given the pattern and node");
}
