use std::collections::HashMap;

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use webgme_pattern_engine::{
    find_assignments, gme,
    pattern::{self, Constant, Element, Node, Property, Relation},
    petgraph::Graph,
    Primitive,
};

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("find name of active node (of 500)", |b| {
        let mut graph = Graph::new();
        let attr = graph.add_node(Element::Attribute);
        let attr_name = graph.add_node(Element::Constant(Constant::Primitive(Primitive::String(
            String::from("name"),
        ))));
        graph.add_edge(
            attr,
            attr_name,
            Relation::With(Property::Name, Property::Value),
        );
        // create the active node
        let origin = graph.add_node(Element::Node(Node::ActiveNode));
        graph.add_edge(origin, attr, Relation::Has);

        let pattern = pattern::Pattern::new(graph);

        // create the nodes
        let attr_val = |s: String| gme::Attribute(Primitive::String(s));

        let nodes = std::iter::once(gme::Node {
            id: gme::NodeId::new(String::from("/target")),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: [(
                gme::AttributeName(String::from("name")),
                attr_val("test_val".into()),
            )]
            .into_iter()
            .collect::<HashMap<_, _>>(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        })
        .chain((0..500).map(|i| {
            let attributes: HashMap<_, _> = [
                (
                    gme::AttributeName(String::from("test")),
                    attr_val("test_val".into()),
                ),
                (
                    gme::AttributeName(String::from("index")),
                    attr_val(format!("{}", i)),
                ),
                (
                    gme::AttributeName(String::from("name")),
                    attr_val(format!("node #{}", i)),
                ),
            ]
            .into_iter()
            .collect();

            gme::Node {
                id: gme::NodeId::new(format!("/n{}", i)),
                base: None,
                is_active: false,
                is_meta: false,
                attributes,
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            }
        }));

        let gme_node = gme::NodeInContext::from_vec(nodes.collect()).unwrap();
        b.iter(|| find_assignments(black_box(gme_node.clone()), black_box(&pattern)))
    });

    c.bench_function("find child of active node (tree w/ 1500 nodes)", |b| {
        let mut graph = Graph::new();
        let child = graph.add_node(Element::Node(Node::AnyNode));
        let active = graph.add_node(Element::Node(Node::ActiveNode));
        graph.add_edge(child, active, Relation::ChildOf);

        let pattern = pattern::Pattern::new(graph);

        // Build up a large tree of nodes
        let other_nodes = (0..100).flat_map(|i| {
            let child_ids = (1..100).map(move |j| gme::NodeId::new(format!("/n{}/{}", i, j)));
            let child_idx = (1..100).map(move |j| gme::NodeIndex(100 * i + j));

            let parent = gme::Node {
                id: gme::NodeId::new(format!("/n{}", i)),
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: child_idx.collect(),
            };
            std::iter::once(parent).chain(child_ids.map(|id| gme::Node {
                id,
                base: None,
                is_active: false,
                is_meta: false,
                attributes: HashMap::new(),
                pointers: HashMap::new(),
                sets: HashMap::new(),
                children: Vec::new(),
            }))
        });
        let target_child_idx = gme::NodeIndex(10_001);
        let target_nodes = std::iter::once(gme::Node {
            id: gme::NodeId::new("/target".into()),
            base: None,
            is_active: true,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: vec![target_child_idx],
        })
        .chain(std::iter::once(gme::Node {
            id: gme::NodeId::new("/target/child".into()),
            base: None,
            is_active: false,
            is_meta: false,
            attributes: HashMap::new(),
            pointers: HashMap::new(),
            sets: HashMap::new(),
            children: Vec::new(),
        }));

        let nodes: Vec<_> = other_nodes.chain(target_nodes).collect();
        let gme_node = gme::NodeInContext::from_vec(nodes).unwrap();
        b.iter(|| find_assignments(black_box(gme_node.clone()), black_box(&pattern)))
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
