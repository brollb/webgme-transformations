const fs = require("fs/promises");
const engineFactory = require("./pkg-es-pack/gme-pattern-engine.min");

if (process.argv.length < 4) {
  console.error(`usage: ${process.argv[0]} <pattern file> <target file>`);
  process.exit(1);
}

async function main(patternPath, modelPath) {
  const pattern = require(patternPath);
  const model = require(modelPath);
  const engine = await engineFactory.create();
  console.log({ model, pattern });
  const matches = await engine.find_matches(model, pattern);
  console.log(matches);
}
main(...process.argv.slice(2));
