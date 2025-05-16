// figscript-package/rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
// const packageJson = require('./package.json'); // If you need to access package.json values

export default [
  {
    // Main bundle (CommonJS and ES Module)
    input: 'src/index.ts', // Your library's entry point
    output: [
      {
        file: 'dist/cjs/index.js', // packageJson.main
        format: 'cjs', // CommonJS
        sourcemap: true,
      },
      {
        file: 'dist/esm/index.js', // packageJson.module
        format: 'esm', // ES Module
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(), // Exclude peer dependencies from the bundle
      resolve(), // Resolves node_modules
      commonjs(), // Converts CommonJS modules to ES6
      typescript({ tsconfig: './tsconfig.json' }), // Transpiles TypeScript
    ],
    external: ['react', 'react-dom'], // Explicitly declare external dependencies if needed beyond peerDeps
  },
  {
    // Type definitions bundle
    input: 'dist/types/index.d.ts', // Entry point for type definitions (after tsc generates them)
    output: [{ file: 'dist/types/index.d.ts', format: 'esm' }], // Output a single .d.ts file
    plugins: [dts()], // Rollup plugin to bundle .d.ts files
    external: [/\.css$/], // Ignore CSS imports in d.ts files if any (less common for libraries)
  },
];