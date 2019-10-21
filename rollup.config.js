// rollup.config.js
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import hashbang from 'rollup-plugin-hashbang';
import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript';

export default {
  input: ['src/mf-build.ts', 'src/mf-bundle.ts', 'src/mf-test.ts'],
  output: {
    dir: 'dist',
    format: 'cjs'
  },
  plugins: [
    babel({
      exclude: "node_modules/**",
    }),
    commonjs({
      include: [
        'node_modules/**',
      ],
      exclude: [
        'node_modules/process-es6/**',
      ],
    }),
    hashbang(),
    nodeResolve(),
    typescript()
  ],
}
