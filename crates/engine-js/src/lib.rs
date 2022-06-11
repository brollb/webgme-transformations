mod utils;

use std::collections::HashMap;
use std::rc::Rc;
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

#[wasm_bindgen]
pub struct GMENode {
    id: String,
    is_active: Option<bool>,
    is_meta: Option<bool>,
    attributes: HashMap<String, String>, // TODO: add support for other attribute types
    children: Vec<GMENode>,
}

#[wasm_bindgen]
impl GMENode {
    #[wasm_bindgen(constructor)]
    pub fn new(id: String, name: String) -> Self {
        let attributes: HashMap<_, _> = vec![("name".to_owned(), name)].into_iter().collect();
        Self {
            id,
            is_active: Some(false),
            is_meta: Some(false),
            attributes,
            children: Vec::new(),
        }
    }

    #[wasm_bindgen]
    pub fn add_child(&mut self, child: GMENode) {
        self.children.push(child);
    }
}

impl From<GMENode> for gme::Node {
    fn from(node: GMENode) -> gme::Node {
        let attributes: HashMap<gme::AttributeName, gme::Attribute> = node
            .attributes
            .into_iter()
            .map(|(name, val)| {
                (
                    gme::AttributeName(name),
                    gme::Attribute(Primitive::String(val)),
                )
            })
            .collect();
        gme::Node {
            id: gme::NodeId(node.id),
            base: None, // TODO: add support for this
            is_active: node.is_active.unwrap_or(false),
            is_meta: node.is_meta.unwrap_or(false),
            attributes,
            pointers: HashMap::new(), // TODO
            sets: HashMap::new(),     // TODO
            children: Vec::new(),     // TODO
        }
    }
}

// pattern components
#[wasm_bindgen]
pub enum Element {
    Node,
    Edge,
}

// TODO: Should I make a generic type that then just records the name and arguments?
// TODO: a little disappointing but should be ok
// TODO: add an ID to these automatically? Or just return assignments in the same order?
#[wasm_bindgen]
pub struct Attribute;

#[wasm_bindgen]
pub struct Constant {
    value: JsValue,
}

#[wasm_bindgen]
pub struct Edge {
    //src: ,
    //dst: ,
    //relation: ,
}

#[wasm_bindgen]
pub struct Relation;

#[wasm_bindgen]
impl Relation {
    #[wasm_bindgen(constructor)]
    pub fn With() {
        todo!();
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct Pattern {
    //nodes: Vec<Reference>,
    //edges: Vec<Relation>,
}

impl From<Pattern> for pattern::Pattern {
    fn from(pattern: Pattern) -> Self {
        todo!();
    }
}

#[wasm_bindgen]
impl Pattern {
    #[wasm_bindgen(constructor)]
    pub fn new(elements: Vec<f64>) -> Self {
        //pub fn new(elements: Vec<Element>) -> Self {
        // TODO:
        todo!();
    }

    #[wasm_bindgen]
    pub fn matches(&self, node: GMENode) {
        let node: gme::Node = node.into();
        let pattern: pattern::Pattern = self.clone().into();

        let attr_name = gme::AttributeName(String::from("name"));
        let name = match node
            .attributes
            .get(&attr_name)
            .unwrap_or(&gme::Attribute(Primitive::String(String::from("<none>"))))
        {
            gme::Attribute(Primitive::String(name)) => name.to_owned(),
            _ => String::from("WRONG TYPE"),
        };

        log(&format!("called matches with node named: {}", name));

        // TODO: accept a webgme node in WJI format and a pattern and return a list of assignments
        //alert("Hello, gme-pattern-engine!");
    }
}
