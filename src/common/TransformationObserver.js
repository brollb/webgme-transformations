define(["./ModelTransformation"], function (Transformation) {
  // TODO: select the region for the
  // Given:
  //  - transformation
  //  - observer
  class TransformationObserver {
    constructor(client, callback) {
      this.client = client;
      this.callback = callback;
      // TODO: get the core, too
    }

    observe(transformationNode, inputModelNode) {
      this._onChange
      // TODO: connect the client to the transformation
    }

    private _onChange(transformationNode, inputModelNode) {
      const output = transformation.apply(inputModelNode);
      this.callback(output);
    }

    disconnect() {
      // TODO:
    }
  }

  return TransformationObserver;
});
