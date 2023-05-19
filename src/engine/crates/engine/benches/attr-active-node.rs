use criterion::{black_box, criterion_group, criterion_main, Criterion};
use webgme_pattern_engine::{find_assignments, gme, pattern, Primitive};

fn attr_active_node_50(node: gme::NodeInContext, pattern: &pattern::Pattern) -> u64 {
    // TODO
}

fn criterion_benchmark(c: &mut Criterion) {
    // TODO: create 50 nodes
    c.bench_function("find_assignments 50", |b| {
        let nodes = 
        b.iter(|| find_assignments(black_box(nodes), black_box(pattern)))
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
