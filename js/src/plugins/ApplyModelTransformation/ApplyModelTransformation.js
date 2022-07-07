/*globals define*/
/*eslint-env node, browser*/

define([
    'webgme-transformations/ModelTransformation',
    'common/util/assert',
    'text!./metadata.json',
    'plugin/PluginBase'
], function (
    Transformation,
    assert,
    pluginMetadata,
    PluginBase
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    class ApplyModelTransformation extends PluginBase {
        constructor() {
            super();
            this.pluginMetadata = pluginMetadata;
        }

        async main() {
            const {transformPath} = this.getCurrentConfig();
            const node = await this.core.loadByPath(this.rootNode, transformPath);

            assert(
                node,
                new Error(`Node at ${transformPath} is not a valid transformation`)
            );
            assert(
                this.core.isTypeOf(node, this.META.Transformation),
                new Error(`Node at ${transformPath} is not a valid transformation`),
            );

            const transformation = await Transformation.fromNode(this.core, node);
            const outputNodes = await transformation.apply(this.activeNode);
            const transformName = this.core.getAttribute(node, 'name');
            const name = this.core.getAttribute(this.activeNode, 'name');
            const filename = `${name}_${transformName}.json`;
            this.addFile(filename, JSON.stringify(outputNodes));
            this.result.setSuccess(true);
        }
    }

    ApplyModelTransformation.metadata = pluginMetadata;

    return ApplyModelTransformation;
});
