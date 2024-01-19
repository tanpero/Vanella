const esbuild = require('esbuild');
const sassPlugin = require('esbuild-plugin-sass');

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: true,
  target: 'es2020',
  platform: 'node',
  outfile: 'dist/bundle.js',
  sourcemap: true,
}).catch(e => (console.log(e), process.exit(1)));

esbuild.build({
  entryPoints: ['src/app/src/main.ts'],
  bundle: true,
  minify: true,
  target: 'es2020',
  outfile: 'dist/app/bundle.js',
  sourcemap: true,
  plugins: [sassPlugin()],
}).catch(e => (console.log(e), process.exit(1)));
