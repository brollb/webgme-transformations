import Transformation from "./ModelTransformation";
import { Option, None, Some } from 'oxide.ts';
export class NodeObserver {
    constructor(client, callback) {
        this.client = client;
        this.callback = callback;
        this.territoryId = None;
    }
    observe(nodePath, depth) {
        // use the client to subscribe to changes in each (territories)
        this.disconnect();
        this.territoryId = this.client.addUI(this, this.callback);
        const territory = {};
        territory[nodePath] = { children: depth };
        console.log('updateTerritory for', nodePath, ':', this.territoryId, territory);
        this.client.updateTerritory(this.territoryId, territory);
    }
    disconnect() {
        if (this.territoryId) {
            this.client.removeUI(this.territoryId);
            this.territoryId = null;
        }
    }
}
class TransformState {
    constructor() {
        this.reset();
    }
    reset() {
        this.input = None;
        this.transformation = None;
    }
}
export default class TransformationObserver {
    // keep track of the current state (ie, transform and input model)
    constructor(client, defaultTransformation, callback) {
        this.callback = callback;
        this.defaultTransFactory = defaultTransformation;
        this.state = new TransformState();
        this.modelObserver = new NodeObserver(client, async () => {
            const input = await this._getNode(client, this.inputPath);
            this.state.input = Some(input);
            // TODO: should we check the transformPath instead?
            if (this.state.transformation.isSome()) {
            }
            if (this.state.transformation.isSome()) {
                const transformData = this.state.transformation.unwrap();
                const isFactory = typeof transformData === 'function';
                let transformation;
                if (isFactory) {
                    const { core } = await this._getCoreInstance(client);
                    transformation = transformData(core);
                }
                else {
                    transformation = transformData;
                }
                this._runTransformation(transformation, this.state.input.unwrap());
            }
        });
        this.transformObserver = new NodeObserver(client, async () => {
            const transformation = await this._getTransformation(client, this.transformPath);
            this.state.transformation = Some(transformation);
            if (this.state.input.isSome()) {
                this._runTransformation(transformation, this.state.input.unwrap());
            }
        });
    }
    observe(inputPath, transformPath) {
        // use the client to subscribe to changes in each (territories)
        this.inputPath = Option.from(inputPath);
        this.transformPath = Option.from(transformPath);
        this.modelObserver.observe(inputPath, Infinity);
        if (this.transformPath.isSome()) {
            this.transformObserver.observe(transformPath, Infinity);
        }
        else {
            this.transformObserver.disconnect();
        }
    }
    disconnect() {
        this.modelObserver.disconnect();
        this.transformObserver.disconnect();
    }
    async _getCoreInstance(client) {
        return new Promise((resolve, reject) => {
            client.getCoreInstance((err, result) => {
                if (err)
                    return reject(err);
                resolve(result);
            });
        });
    }
    async _getTransformation(client, nodePath) {
        const { core, rootNode } = await this._getCoreInstance(client);
        const transformationNode = await core.loadByPath(rootNode, nodePath);
        return await Transformation.fromNode(core, transformationNode);
    }
    async _getNode(client, nodePath) {
        const { core, rootNode } = await this._getCoreInstance(client);
        return await core.loadByPath(rootNode, nodePath);
    }
    async _runTransformation(transformation, input) {
        const output = await transformation.apply(input);
        this.callback(output);
    }
}
