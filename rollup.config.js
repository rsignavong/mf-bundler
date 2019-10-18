// rollup.config.js
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import hashbang from 'rollup-plugin-hashbang';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/mf-bundler.js',
  output: {
    file: 'dist/mf-bundle.js',
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
  ],
}
