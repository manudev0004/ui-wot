/* Postbuild: generate subpath proxy bundles for services/components/utils
 * Stencil outputs esm/index.js and cjs/index.cjs.js. So to create small proxy files
 * at dist/services(.js|.cjs.js) that re-export from ./esm/index.js but only the
 * services namespace, to satisfy package.json exports subpaths.
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');

function write(file, content) {
  fs.writeFileSync(file, content);
  console.log('[postbuild] wrote', path.relative(dist, file));
}

// Generate dist/services.js (ESM) and dist/services.cjs.js (CJS)
(function genServices() {
  const esmFile = path.join(dist, 'services.js');
  const cjsFile = path.join(dist, 'services.cjs.js');
  // ESM: re-export only from collection services entry to avoid heavy esm index
  const esm = "export * from './collection/services/index.js';\n";
  const cjs = "module.exports = require('./cjs/index.cjs.js');\n";
  write(esmFile, esm);
  write(cjsFile, cjs);
})();

// Generate dist/components.js (ESM) and dist/components.cjs.js (CJS)
(function genComponents() {
  const esmFile = path.join(dist, 'components.js');
  const cjsFile = path.join(dist, 'components.cjs.js');
  const esm = "export * from './components/index.js';\n";
  const cjs = "module.exports = require('./components/index.js');\n";
  write(esmFile, esm);
  write(cjsFile, cjs);
})();

// Generate dist/utils.js (ESM) and dist/utils.cjs.js (CJS)
(function genUtils() {
  const esmFile = path.join(dist, 'utils.js');
  const cjsFile = path.join(dist, 'utils.cjs.js');
  // Re-export only utils from collection to avoid esm index
  const esm = "export * from './collection/utils/index.js';\n";
  const cjs = "module.exports = require('./cjs/index.cjs.js');\n";
  write(esmFile, esm);
  write(cjsFile, cjs);
})();

// After building, regenerate component docs to overwrite component readme.md with enhanced docs
(function runDocsEnhancer() {
  try {
    const gen = path.join(__dirname, 'generate-component-docs.js');
    if (fs.existsSync(gen)) {
      require(gen);
      console.log('[postbuild] enhanced component docs updated');
    }
  } catch (err) {
    console.warn('[postbuild] docs enhancement failed:', err && err.message);
  }
})();
