/**
 * Build script for Light MD Viewer Chrome Extension.
 *
 * 1. Bundles CodeMirror 6 (src/editor.js) into lib/codemirror-bundle.js
 * 2. Bundles marked.js (src/marked-global.js) into lib/marked.min.js
 * 3. Bundles highlight.js (src/hljs-global.js) into lib/highlight.min.js
 * 4. Downloads mermaid dist from CDN (kept out of npm to avoid transitive vulnerabilities)
 * 5. Copies highlight.js CSS theme from node_modules to css/
 *
 * Usage:
 *   npm run build           # one-time build
 *   npm run build:watch     # rebuild on changes (bundles only)
 */

import * as esbuild from 'esbuild';
import { copyFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

// Mermaid version and integrity hash (update both when upgrading)
const MERMAID_VERSION = '11.4.1';
const MERMAID_URL = `https://cdnjs.cloudflare.com/ajax/libs/mermaid/${MERMAID_VERSION}/mermaid.min.js`;
const MERMAID_SHA256 = null; // Set after first download, then verify on subsequent builds

// Ensure output directories exist
['lib', 'css'].forEach(dir => {
  const p = join(__dirname, dir);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
});

// --- Step 1: Bundle all JS libraries with esbuild ---

const sharedOptions = {
  bundle: true,
  format: 'iife',
  minify: true,
  sourcemap: false,
  target: ['chrome110'],
  logLevel: 'info',
};

const bundles = [
  {
    entryPoints: [join(__dirname, 'src', 'editor.js')],
    outfile: join(__dirname, 'lib', 'codemirror-bundle.js'),
    ...sharedOptions,
  },
  {
    entryPoints: [join(__dirname, 'src', 'marked-global.js')],
    outfile: join(__dirname, 'lib', 'marked.min.js'),
    ...sharedOptions,
  },
  {
    entryPoints: [join(__dirname, 'src', 'hljs-global.js')],
    outfile: join(__dirname, 'lib', 'highlight.min.js'),
    ...sharedOptions,
  },
];

if (isWatch) {
  for (const opts of bundles) {
    const ctx = await esbuild.context(opts);
    await ctx.watch();
  }
  console.log('Watching for changes...');
} else {
  await Promise.all(bundles.map(opts => esbuild.build(opts)));
}

// --- Step 2: Copy highlight.js CSS theme ---

function findFile(...candidates) {
  for (const c of candidates) {
    const p = join(__dirname, 'node_modules', c);
    if (existsSync(p)) return p;
  }
  throw new Error('Could not find any of: ' + candidates.join(', '));
}

const cssSrc = findFile('highlight.js/styles/github.min.css', 'highlight.js/styles/github.css');
const cssDest = join(__dirname, 'css', 'github-highlight.css');
copyFileSync(cssSrc, cssDest);
console.log(`Copied: ${cssSrc} -> ${cssDest}`);

// --- Step 3: Download mermaid from CDN ---
// Mermaid is downloaded separately to keep its large transitive dependency tree
// (chevrotain -> lodash-es with known vulnerabilities) out of npm audit scope.
// The pre-built dist file has no runtime dependency on lodash-es.

const mermaidDest = join(__dirname, 'lib', 'mermaid.min.js');

if (existsSync(mermaidDest) && !process.argv.includes('--force')) {
  console.log(`Mermaid ${MERMAID_VERSION} already present, skipping (use --force to re-download)`);
} else {
  console.log(`Downloading mermaid ${MERMAID_VERSION} from CDN...`);
  const response = await fetch(MERMAID_URL);
  if (!response.ok) {
    throw new Error(`Failed to download mermaid: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  // Verify integrity if hash is set
  const hash = createHash('sha256').update(buffer).digest('hex');
  if (MERMAID_SHA256 && hash !== MERMAID_SHA256) {
    throw new Error(
      `Mermaid integrity check failed!\n` +
      `  Expected: ${MERMAID_SHA256}\n` +
      `  Got:      ${hash}\n` +
      `  This could indicate a compromised CDN. Do not use this file.`
    );
  }

  writeFileSync(mermaidDest, buffer);
  console.log(`Downloaded mermaid ${MERMAID_VERSION} (${(buffer.length / 1024).toFixed(0)} KB)`);
  console.log(`  SHA-256: ${hash}`);

  if (!MERMAID_SHA256) {
    console.log(`\n  NOTE: Pin this hash in build.mjs for future integrity verification:`);
    console.log(`  const MERMAID_SHA256 = '${hash}';`);
  }
}

console.log('\nBuild complete. Extension is ready to load from this directory.');
