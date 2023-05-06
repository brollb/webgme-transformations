mod utils;

use core::convert::TryFrom;
use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet},
    convert::TryInto,
};
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
pub struct GMEContext {
    nodes: Vec<GMENode>,
}

#[wasm_bindgen]
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

#[wasm_bindgen]
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

#[wasm_bindgen]
pub fn find_matches(context: &JsValue, pattern: &JsValue) -> JsValue {
    utils::set_panic_hook();

    let context = context.into_serde::<GMEContext>();
    let context: GMEContext = context.unwrap();
    let context: gme::NodeInContext = context.try_into().unwrap();

    let pattern = pattern.into_serde::<pattern::Pattern>();
    let pattern = pattern.unwrap();

    let assignments = find_assignments(context, &pattern);
    JsValue::from_serde(&assignments).unwrap()
}

#[wasm_bindgen]
pub fn test(pattern: &JsValue, context: &JsValue) -> JsValue {
    utils::set_panic_hook();

    // TODO: update this to use iterators and just check for a single match
    let context = context.into_serde::<GMEContext>();
    let context: GMEContext = context.unwrap();
    let context: gme::NodeInContext = context.try_into().unwrap();

    let pattern = pattern.into_serde::<pattern::Pattern>();
    let pattern = pattern.unwrap();

    let assignments = find_assignments(context, &pattern);
    JsValue::from_bool(!assignments.is_empty())
}
