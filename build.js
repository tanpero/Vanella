const esbuild = require('esbuild');
const sassPlugin = require('esbuild-plugin-sass');

const fs = require('fs-extra');

const sourcePath = 'src/app/index.html';
const destinationPath = 'dist/app/index.html';


esbuild.build({
  entryPoints: ['src/main.ts'],
  target: 'es2020',
  platform: 'node',
  outfile: 'dist/main.js',
  bundle: true,
  sourcemap: true,
  packages: 'external',
}).then(() => fs.copySync(sourcePath, destinationPath)
).catch(e => (console.log(e), process.exit(1)));

esbuild.build({
  entryPoints: ['src/preload.ts'],
  target: 'es2020',
  platform: 'node',
  outfile: 'dist/preload.js',
  bundle: true,
  sourcemap: true,
  packages: 'external',
}).catch(e => (console.log(e), process.exit(1)));

esbuild.build({
  entryPoints: ['src/app/src/main.ts'],
  bundle: true,
  target: 'es2020',
  outfile: 'dist/app/bundle.js',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'js',
    '.jsx': 'jsx',
    '.sass': 'css', // 设置 SASS 文件的加载器为 'css'
  },
  sourcemap: true,
  plugins: [sassPlugin()],
}).catch(e => (console.log(e), process.exit(1)));
