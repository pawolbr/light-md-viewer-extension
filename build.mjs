/**
 * Build script for Light MD Viewer Chrome Extension.
 *
 * 1. Bundles CodeMirror 6 (src/editor.js) into lib/codemirror-bundle.js
 * 2. Copies marked, highlight.js, mermaid dist files from node_modules to lib/
 * 3. Copies highlight.js CSS theme to css/
 *
 * Usage:
 *   npm run build           # one-time build
 *   npm run build:watch     # rebuild on changes
 */

import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

// Ensure output directories exist
['lib', 'css'].forEach(dir => {
  const p = join(__dirname, dir);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
});

// --- Step 1: Bundle CodeMirror 6 ---
const buildOptions = {
  entryPoints: [join(__dirname, 'src', 'editor.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  sourcemap: false,
  target: ['chrome110'],
  outfile: join(__dirname, 'lib', 'codemirror-bundle.js'),
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
}

// --- Step 2: Copy library dist files from node_modules ---

function findFile(...candidates) {
  for (const c of candidates) {
    const p = join(__dirname, 'node_modules', c);
    if (existsSync(p)) return p;
  }
  throw new Error('Could not find any of: ' + candidates.join(', '));
}

const fileCopies = [
  {
    src: findFile('marked/marked.min.js'),
    dest: join(__dirname, 'lib', 'marked.min.js'),
  },
  {
    // highlight.js browser build
    src: findFile(
      'highlight.js/lib/highlight.js',
      '@aspect-build/highlight.js/highlight.min.js'
    ),
    dest: join(__dirname, 'lib', 'highlight.min.js'),
  },
  {
    // highlight.js github theme CSS
    src: findFile(
      'highlight.js/styles/github.min.css',
      'highlight.js/styles/github.css'
    ),
    dest: join(__dirname, 'css', 'github-highlight.css'),
  },
  {
    // mermaid browser build
    src: findFile(
      'mermaid/dist/mermaid.min.js',
      'mermaid/dist/mermaid.js'
    ),
    dest: join(__dirname, 'lib', 'mermaid.min.js'),
  },
];

for (const { src, dest } of fileCopies) {
  copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

console.log('\nBuild complete. Extension is ready to load from this directory.');
