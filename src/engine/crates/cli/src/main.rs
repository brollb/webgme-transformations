mod utils;

use clap::Parser;
use std::fs;
use webgme_pattern_engine::{find_assignments, gme};

// FIXME: integrate this better with engine-js types
#[derive(Parser, Debug)]
#[clap(author, version, about)]
struct Args {
    // path to the model (JSON)
    context: String,
    // path to the pattern (JSON)
    pattern: String,
}

fn main() {
    let args = Args::parse();
    let context = serde_json::from_str(&fs::read_to_string(&args.context).unwrap());
    let context: utils::GMEContext = context.unwrap();
    let context: gme::NodeInContext = context.try_into().unwrap();

    let pattern = serde_json::from_str(&fs::read_to_string(&args.pattern).unwrap()).unwrap();

    let assignments = find_assignments(context, &pattern);
    println!("{}", serde_json::to_string(&assignments).unwrap());
}
