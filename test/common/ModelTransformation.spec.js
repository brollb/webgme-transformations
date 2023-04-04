/*jshint node:true, mocha:true*/

"use strict";

const testFixture = require("../globals");
const assert = require("assert");
const { ModelTransformation: Transformation, Pattern, AnyNode, GMENode } =
  require(
    "../../dist/common/index",
  );

describe("ModelTransformation", function () {
  const _ = testFixture.requirejs("underscore");
  const Core = testFixture.requirejs("common/core/coreQ");
  const gmeConfig = testFixture.getGmeConfig();
  const path = testFixture.path;
  //const SEED_DIR = path.join(mydir, '..', '..', 'src', 'seeds');
  const SEED_DIR = path.join("src", "seeds");
  const Q = testFixture.Q;
  const logger = testFixture.logger.fork("ModelTransformations");
  const projectName = "testProject";
  let project,
    gmeAuth,
    storage,
    commitHash,
    core;

  before(async function () {
    this.timeout(7500);
    gmeAuth = await testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName);
    storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
    await storage.openDatabase();
    const importParam = {
      projectSeed: path.join(SEED_DIR, "test", "test.webgmex"),
      projectName: projectName,
      branchName: "master",
      logger: logger,
      gmeConfig: gmeConfig,
    };

    const importResult = await testFixture.importProject(storage, importParam);
    project = importResult.project;
    core = new Core(project, {
      globConf: gmeConfig,
      logger: logger.fork("core"),
    });
    commitHash = importResult.commitHash;
  });

  after(async function () {
    await storage.closeDatabase();
    await gmeAuth.unload();
  });

  let counter = 1;
  async function getNewRootNode(core) {
    const branchName = "test" + counter++;
    await project.createBranch(branchName, commitHash);
    const branchHash = await project.getBranchHash(branchName);
    const commit = await Q.ninvoke(project, "loadObject", branchHash);
    return await Q.ninvoke(core, "loadRoot", commit.root);
  }

  let importer,
    node,
    original,
    root,
    fco;

  async function getNodeByName(...names) {
    const node = names.reduce(async (getParent, name) => {
      const parent = await getParent;
      const children = await core.loadChildren(parent);
      const node = children.find((c) => core.getAttribute(c, "name") === name);

      if (!node) {
        throw new Error(`Could not find node named ${names.join(" > ")}`);
      }

      return node;
    }, root);

    return node;
  }

  beforeEach(async () => {
    root = await getNewRootNode(core);
    fco = await core.loadByPath(root, "/1");
  });

  describe("Pattern", function () {
    it("should transform (typed) Node -> AnyNode", async function () {
      const patternNode = await getNodeByName(
        "AttributeTable",
        "CreateTable",
        "OutputStructure",
      );
      console.log({ Transformation });
      const outputPattern = await Pattern.fromNode(core, patternNode);
      const elements = outputPattern.getElements();
      const nodes = elements.filter((e) => e.type.isNode());
      assert.equal(
        nodes.length,
        2,
        "Found more than 2 node element in output pattern",
      );
      const anyNode = nodes.find((e) => !e.type.isConstant());
      console.log({ AnyNode });
      assert(anyNode && anyNode.type instanceof AnyNode);
    });
  });

  describe("GMENode", function () {
    it("should not omit inherited attributes", async () => {
      const child = core.createNode({ parent: root, base: fco });
      const node = await GMENode.fromNode(core, child);
      assert(node.attributes.name);
    });
  });

  describe("simple table example", function () {
    let outputNodes;
    beforeEach(async () => {
      const node = await getNodeByName("AttributeTable");
      const transformation = await Transformation.fromNode(core, node);
      const model = await getNodeByName("NodeWithTwoAttributes");
      outputNodes = await transformation.apply(model);
    });

    it("should create nodes (rows) for each attribute", async function () {
      const allNodes = flatten(outputNodes, (node) => node.children);
      const rows = allNodes.filter((node) => node.pointers.base === "/O");
      assert.equal(rows.length, 2);
    });

    function flatten(list, fn) {
      return list.reduce((l, node) => l.concat(flatten(fn(node), fn)), list);
    }

    it("should create rows as children", async function () {
      const [table] = outputNodes;
      table.children.every((node) => node.pointers.base === "/O");
    });

    it("should create a single table", async function () {
      assert.equal(outputNodes.length, 1);
    });

    it("should only create nodes with a base pointer", async function () {
      const withoutBasePtr = (node) => {
        if (!node.pointers.base) {
          return node;
        }
        return node.children?.find(withoutBasePtr);
      };
      const invalidNode = outputNodes.find((n) => withoutBasePtr(n));
      assert(
        !invalidNode,
        `Found node without base pointer: ${JSON.stringify(invalidNode)}`,
      );
    });

    it("should not create nodes w/ same ID", async function () {
      const uniqNodes = _.uniq(outputNodes, false, (node) => node.id);
      assert.equal(uniqNodes.length, outputNodes.length);
    });
  });
});
