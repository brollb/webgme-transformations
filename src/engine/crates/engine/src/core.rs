use serde::{Deserialize, Serialize};
use std::hash::Hash;

#[derive(Clone, Eq, Hash, PartialEq, Debug, Deserialize, Serialize)]
pub enum Primitive {
    String(String),
    Boolean(bool),
    Integer(i32),
    // TODO: etc (add f32, etc)
}
