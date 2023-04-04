mod utils;

use serde::Deserialize;
use std::{collections::HashMap, rc::Rc};
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
pub struct GMENode {
    id: String,
    is_active: Option<bool>,
    is_meta: Option<bool>,
    attributes: HashMap<String, Primitive>,
    pointers: HashMap<String, String>,
    children: Vec<GMENode>,
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
            children: Vec::new(),
        }
    }
}

impl From<GMENode> for gme::Node {
    fn from(node: GMENode) -> gme::Node {
        let attributes: HashMap<gme::AttributeName, gme::Attribute> = node
            .attributes
            .into_iter()
            .map(|(name, val)| (gme::AttributeName(name), gme::Attribute(val)))
            .collect();

        gme::Node {
            id: gme::NodeId(node.id),
            base: None, // TODO: add support for this
            is_active: node.is_active.unwrap_or(false),
            is_meta: node.is_meta.unwrap_or(false),
            attributes,
            pointers: HashMap::new(), // TODO
            sets: HashMap::new(),     // TODO
            children: node
                .children
                .into_iter()
                .map(|child| Rc::new(child.into()))
                .collect::<Vec<Rc<gme::Node>>>(),
        }
    }
}

#[wasm_bindgen]
pub fn find_matches(node: &JsValue, pattern: &JsValue, referenced_nodes: &JsValue) -> JsValue {
    let node = node.into_serde::<GMENode>();
    let node: GMENode = node.unwrap();
    let pattern = pattern.into_serde::<pattern::Pattern>();
    let pattern = pattern.unwrap();
    let gme_node: gme::Node = node.into();
    let assignments = find_assignments(gme_node, &pattern);
    JsValue::from_serde(&assignments).unwrap()
}

#[wasm_bindgen]
pub fn test(pattern: &JsValue, node: &JsValue, referenced_nodes: &JsValue) -> JsValue {
    todo!("Check that there is at least one match given the pattern and node");
}
