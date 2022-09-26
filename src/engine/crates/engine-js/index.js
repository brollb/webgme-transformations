const engine = import('./pkg');

function createOutputModel(elements, assignments) {
	// TODO: how about we create a list of the nodes with the given name
	// TODO: For each of the assignments, create a new node with the given ID and attribute name
	const attrRef = assignments[0];
	console.log(`reference to a node with the given name: ${attrRef}`);

	return attrRef.nodeId;
	// In practice, elements will likely be node paths of the element nodes
	// This will allow them to easily be turned into a lookup dict
}

engine.then(m => {
	// Here is an example of how to find nodes with a given name

	// Create an example GME subtree
	const parent = new m.GMENode("/path", "parent");
	parent.add_child(new m.GMENode("/path/1", "target"));
	parent.add_child(new m.GMENode("/path/2", "target"));
	const other_child = new m.GMENode("/path/3", "other_child");
	parent.add_child(other_child);
	other_child.add_child(new m.GMENode("/path/3/1", "target"));

	// Create an example pattern finding all attributes "name" = "target"
	const attr = new m.Attribute();
	const name_const = new m.Constant("name");
	const target_const = new m.Constant("target");
	const attr_name_rel = new m.Edge(
		attr,
		name_const,
		new m.Relation.With(m.Property.Name, m.Property.Value)
	);
	const attr_val_rel = new m.Edge(
		attr,
		target_const,
		new m.Relation.With(m.Property.Value, m.Property.Value)
	);

	const elements = [
		attr,
		name_const,
		target_const,
		attr_name_rel,
		attr_val_rel,
	];
	const pattern = new m.Pattern(elements);

	// Find all the matches
	const matches = pattern.matches(node);

	// Create a table of all the matching nodes
	console.log(`found ${matches.length} matches`);
	matches.forEach(assignments => console.log('\t', assignments));
	const rows = matches.map(createOutputModel.bind(null, elements));
	console.log({rows});
})
	.catch(console.error);
