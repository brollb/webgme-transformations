const engine = import('./pkg');

engine.then(m => {
	console.log({m});
	const node = new m.GMENode("/path", "hello!");
	const matches = m.matches(node);
})
	.catch(console.error);
