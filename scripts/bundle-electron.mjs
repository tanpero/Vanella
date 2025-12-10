import { build } from 'esbuild'
import path from 'node:path'

const root = process.cwd()

await build({
  entryPoints: [
    path.join(root, 'electron', 'main.cjs'),
    path.join(root, 'electron', 'preload.js'),
  ],
  bundle: true,
  minify: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outdir: path.join(root, 'electron', 'bundle'),
  sourcemap: false,
  external: ['electron'],
  logLevel: 'info',
  treeShaking: true,
  legalComments: 'none',
  drop: ['console', 'debugger'],
})

