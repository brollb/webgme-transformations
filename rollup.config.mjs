import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import copy from "rollup-plugin-copy";

const plugins = [
  commonjs(),
  nodeResolve(),
  typescript(),
  copy({
    targets: [
      {
        src: "src/**/*.!(ts)",
        dest: "dist",
      },
    ],
    flatten: false,
  }),
];

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "umd",
      name: "GMETransformations",
    },
    plugins,
  },
];
