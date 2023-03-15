import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const plugins = [commonjs(), nodeResolve(), typescript()];

export default [
  {
    input: 'src/common/index.ts',
    output: {
      file: 'src/common/index.js',
      format: 'umd',
      name: 'GMETransformations'
    },
    plugins,
  },
];
