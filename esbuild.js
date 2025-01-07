/* eslint-disable @typescript-eslint/no-var-requires */
async function start(watch) {
  const esbuild = require('esbuild');
  const buildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
    mainFields: ['module', 'main'],
    external: ['coc.nvim'],
    platform: 'node',
    target: 'node10.12',
    outfile: 'lib/index.js',
  };

  if (watch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
  } else {
    await esbuild.build(buildOptions);
  }
}

let watch = false;
if (process.argv.length > 2 && process.argv[2] === '--watch') {
  console.log('watching...');
  watch = true;
}

start(watch).catch((e) => {
  console.error(e);
});
