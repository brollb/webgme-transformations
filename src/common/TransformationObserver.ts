import Transformation from "./ModelTransformation";
import { None, Option, Some } from "oxide.ts";

export class NodeObserver {
  private client: Gme.Client;
  private territoryId: Option<string>;
  private callback;

  constructor(client: Gme.Client, callback) {
    this.client = client;
    this.callback = callback;
    this.territoryId = None;
  }

  observe(nodePath: string, depth: number): void {
    // use the client to subscribe to changes in each (territories)
    this.disconnect();

    const territoryId = this.client.addUI(
      this,
      this.callback,
    );
    const territory = {};
    territory[nodePath] = { children: depth };
    console.log(
      "updateTerritory for",
      nodePath,
      ":",
      territoryId,
      territory,
    );
    this.client.updateTerritory(territoryId, territory);

    this.territoryId = Some(territoryId);
  }

  disconnect(): void {
    this.territoryId.map((id) => this.client.removeUI(id));
    this.territoryId = None;
  }
}

class TransformState {
  // transformation or transformation factory
  transformation: Option<Transformation>;
  input: Option<Core.Node>;

  constructor() {
    this.reset();
  }

  reset() {
    this.input = None;
    this.transformation = None;
  }
}

// FIXME: this tracks two different nodes but the transformation is really derived from
// the other
export default class TransformationObserver {
  private modelObserver: NodeObserver;
  private transformObserver: NodeObserver;
  private inputPath: Option<string>;
  private transformPath: Option<string>;
  private state: TransformState;
  private callback: (output: any) => void | Promise<void>;
  // keep track of the current state (ie, transform and input model)

  constructor(
    client: Gme.Client,
    defaultTransformation: (
      core: GmeClasses.Core,
      root: Core.Node,
    ) => Transformation,
    callback,
  ) {
    this.callback = callback;

    this.state = new TransformState();
    this.modelObserver = new NodeObserver(client, async () => {
      const input = await this._getNode(client, this.inputPath.unwrap());
      this.state.input = Some(input);

      let transformation: Transformation;
      if (this.state.transformation.isSome()) {
        transformation = this.state.transformation.unwrap();
      } else if (this.transformPath.isNone()) { // use the default if no transformation defined
        const { core, rootNode } = await this._getCoreInstance(client);
        transformation = defaultTransformation(core, rootNode);
      }

      if (transformation) {
        this._runTransformation(transformation, this.state.input.unwrap());
      }
    });
    this.transformObserver = new NodeObserver(client, async () => {
      console.log("transform observer callback invoked");
      if (this.transformPath.isSome()) {
        const transformPath = this.transformPath.unwrap();
        const transformation = await this._getTransformation(
          client,
          transformPath,
        );
        this.state.transformation = Some(transformation);

        if (this.state.input.isSome()) {
          this._runTransformation(transformation, this.state.input.unwrap());
        }
      }
    });
  }

  observe(inputPath: string, transformPath: string) {
    // use the client to subscribe to changes in each (territories)
    this.inputPath = Option.from(inputPath);
    this.transformPath = Option.from(transformPath);
    console.log(this.inputPath);
    console.log(this.transformPath);

    const depth = Number.MAX_SAFE_INTEGER;
    this.modelObserver.observe(inputPath, depth);

    if (this.transformPath.isSome()) {
      this.transformObserver.observe(transformPath, depth);
    } else {
      this.transformObserver.disconnect();
    }
  }

  disconnect() {
    this.modelObserver.disconnect();
    this.transformObserver.disconnect();
  }

  private async _getCoreInstance(
    client: Gme.Client,
  ): Promise<{ core: GmeClasses.Core; rootNode: Core.Node }> {
    return new Promise((resolve, reject) => {
      client.getCoreInstance({}, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  private async _getTransformation(
    client: Gme.Client,
    nodePath: string,
  ): Promise<Transformation> {
    const { core, rootNode } = await this._getCoreInstance(client);
    const transformationNode = await core.loadByPath(rootNode, nodePath);
    return await Transformation.fromNode(core, transformationNode);
  }

  private async _getNode(
    client: Gme.Client,
    nodePath: string,
  ): Promise<Core.Node> {
    const { core, rootNode } = await this._getCoreInstance(client);
    return await core.loadByPath(rootNode, nodePath);
  }

  private async _runTransformation(
    transformation: Transformation,
    input: Core.Node,
  ): Promise<void> {
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
