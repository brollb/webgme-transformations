/*jshint node:true, mocha:true*/

'use strict';

describe('ModelTransformation', function () {
    const testFixture = require('../globals');
    const _ = testFixture.requirejs('underscore');
    const Core = testFixture.requirejs('common/core/coreQ');
    const Transformation = testFixture.requirejs('webgme-transformations/ModelTransformation');
    const assert = require('assert');
    const gmeConfig = testFixture.getGmeConfig();
    const path = testFixture.path;
    const SEED_DIR = path.join(__dirname, '..', '..', 'src', 'seeds');
    const Q = testFixture.Q;
    const logger = testFixture.logger.fork('ModelTransformations');
    const projectName = 'testProject';
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
            projectSeed: path.join(SEED_DIR, 'test', 'test.webgmex'),
            projectName: projectName,
            branchName: 'master',
            logger: logger,
            gmeConfig: gmeConfig
        };

        console.log('about to import');
        const importResult = await testFixture.importProject(storage, importParam);
        console.log('import complete');
        project = importResult.project;
        core = new Core(project, {
            globConf: gmeConfig,
            logger: logger.fork('core')
        });
        commitHash = importResult.commitHash;
    });

    after(async function () {
        await storage.closeDatabase();
        await gmeAuth.unload();
    });

    let counter = 1;
    async function getNewRootNode(core) {
        const branchName = 'test' + counter++;
        await project.createBranch(branchName, commitHash);
        const branchHash = await project.getBranchHash(branchName);
        const commit = await Q.ninvoke(project, 'loadObject', branchHash);
        return await Q.ninvoke(core, 'loadRoot', commit.root);
    }

    let importer,
        node,
        original,
        root,
        fco;

    async function getNodeByName(name) {
        const children = await core.loadChildren(root);
        const node = children.find(c => core.getAttribute(c, 'name') === name);
        if (!node) {
            throw new Error(`Could not find node named ${name}`);
        }
        return node;
    }

    beforeEach(async () => {
        root = await getNewRootNode(core);
        fco = await core.loadByPath(root, '/1');
    });

    describe('simple table example', function() {
        it('should create nodes (rows) for each attribute', async function() {
            const node = await getNodeByName('AttributeTable');
            const transformation = await Transformation.fromNode(core, node);
            const model = await getNodeByName('NodeWithTwoAttributes');
			//node = {
				//id: '/some/test',
				//attributes: {},
				//children: []
			//};
            const output = transformation.apply(model);
            assert(false, 'todo!');
        });
    });
});
