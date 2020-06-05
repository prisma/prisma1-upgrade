import nodeResolve from '@rollup/plugin-node-resolve'
import sucrase from '@rollup/plugin-sucrase'
import resolve from 'resolve'
import Module from 'module'
import path from 'path'

export default {
  input: {
    'cli/index': 'src/cli/index.ts',
    'api/index': 'src/api/index.ts',
    'api/index_test': 'src/api/index_test.ts',
  },
  output: {
    name: '[name]',
    chunkFileNames: '[name].js',
    dir: 'dist',
    format: 'cjs',
  },
  external: serverExternal,
  plugins: [
    nodeResolve({
      extensions: ['.js', '.ts'],
      mainFields: ['main'],
      browser: false,
    }),
    sucrase({
      exclude: ['node_modules/**'],
      transforms: ['typescript'],
    }),
  ],
}

function serverExternal(dependency, parent) {
  const dep = resolve.sync(dependency, {
    basedir: path.dirname(parent),
    extensions: ['.js', '.ts'],
  })
  if (~Module.builtinModules.indexOf(dependency)) {
    return true
  }
  if (~dep.indexOf('/node_modules/')) {
    return true
  }
  return false
}
