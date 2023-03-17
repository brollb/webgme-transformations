import type {Client} from './types';
import Transformation from "./ModelTransformation";
import {Option, None, Some} from 'oxide.ts';

export class NodeObserver {
  private client: Client;
  private territoryId: Option<string>;
  private callback;

  constructor(client, callback) {
    this.client = client;
    this.callback = callback;
    this.territoryId = None;
  }
  
  observe(nodePath: string, depth: number): void {
    // use the client to subscribe to changes in each (territories)
    this.disconnect();

    this.territoryId = this.client.addUI(
      this,
      this.callback
    );
    const territory = {};
    territory[nodePath] = { children: depth };
    console.log('updateTerritory for', nodePath, ':', this.territoryId, territory);
    this.client.updateTerritory(this.territoryId, territory);
  }

  disconnect(): void {
    if (this.territoryId) {
      this.client.removeUI(this.territoryId);
      this.territoryId = null;
    }
  }
}

class TransformState {
  // transformation or transformation factory
  transformation: Option<Transformation>;
  input: Option<GmeClasses.Node>;

  constructor() {
    this.reset();
  }

  reset() {
    this.input = None;
    this.transformation = None;
  }
}

export default class TransformationObserver {
  private modelObserver: NodeObserver;
  private transformObserver: NodeObserver;
  private inputPath: Option<string>;
  private transformPath: Option<string>;
  private state: TransformState;
  private defaultTransFactory: (core: GmeClasses.Core) => Transformation;
  private callback: (output: any) => void | Promise<void>;
  // keep track of the current state (ie, transform and input model)

  constructor(client, defaultTransformation, callback) {
    this.callback = callback;
    this.defaultTransFactory = defaultTransformation;

    this.state = new TransformState();
    this.modelObserver = new NodeObserver(client, async () => {
      const input = await this._getNode(client, this.inputPath.unwrap());
      this.state.input = Some(input);

      let transformation;
      if (this.state.transformation.isSome()) {
        transformation = this.state.transformation.unwrap();
      } else if (this.transformPath.isNone()) {  // use the default if no transformation defined
        const {core} = await this._getCoreInstance(client);
        transformation = defaultTransformation(core);
      }

      if (transformation) {
        this._runTransformation(transformation, this.state.input.unwrap());
      }
    });
    this.transformObserver = new NodeObserver(client, async () => {
      console.log('transform observer callback invoked');
      if (this.transformPath.isSome()) {
        const transformPath = this.transformPath.unwrap();
        const transformation = await this._getTransformation(client, transformPath);
        this.state.transformation = Some(transformation);

        if (this.state.input.isSome()) {
          this._runTransformation(transformation, this.state.input.unwrap());
        }
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
    } else {
      this.transformObserver.disconnect();
    }
  }

  disconnect() {
    this.modelObserver.disconnect();
    this.transformObserver.disconnect();
  }

  private async _getCoreInstance(client): Promise<{core: GmeClasses.Core, rootNode: GmeClasses.Node}> {
    return new Promise((resolve, reject) => {
      client.getCoreInstance({}, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      })
    });
  }

  private async _getTransformation(client, nodePath: string): Promise<Transformation> {
    const {core, rootNode} = await this._getCoreInstance(client);
    const transformationNode = await core.loadByPath(rootNode, nodePath);
    return await Transformation.fromNode(core, transformationNode);
  }

  private async _getNode(client, nodePath): GmeClasses.Node {
    const {core, rootNode} = await this._getCoreInstance(client);
    return await core.loadByPath(rootNode, nodePath);
  }

  private async _runTransformation(transformation, input): Promise<void> {
    const output = await transformation.apply(input);
    this.callback(output);
  }
}

/*
 * A transformation observer which derives the transformation following the conventions
 * used for visualizer transformations (ie, looks up the given member of "visualizers")
 *
 * Will this still work if we flip these around so a visualizer engine can be used for
 * multiple visualizers?
 */
class VizTransformObserver {
  private name: string;
}
