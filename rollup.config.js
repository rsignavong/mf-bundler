// rollup.config.js
import babel from "rollup-plugin-babel";
import clean from "rollup-plugin-clean";
import commonjs from "rollup-plugin-commonjs";
import hashbang from "rollup-plugin-hashbang";
import nodeResolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";

export default {
  input: [
    "src/mf-install.ts",
    "src/mf-bundle.ts",
    "src/mf-clean.ts",
    "src/mf-partition.ts",
    "src/mf-serve.ts",
    "src/mf-test.ts",
  ],
  output: {
    dir: "dist",
    format: "cjs",
  },
  plugins: [
    clean(),
    babel({
      exclude: "node_modules/**",
    }),
    commonjs({
      include: ["node_modules/**"],
      exclude: ["node_modules/process-es6/**"],
    }),
    hashbang(),
    nodeResolve(),
    typescript(),
  ],
};
