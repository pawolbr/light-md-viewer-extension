# Dependency Inventory

_Last updated: 2026-04-03_

## npm dependencies (managed via package.json)

| Package | Version | Purpose | Bundle output |
|---------|---------|---------|---------------|
| `codemirror` | ^6.0.1 | Editor (CM6 meta-package) | `lib/codemirror-bundle.js` |
| `@codemirror/lang-markdown` | ^6.3.2 | GFM/Markdown language support | bundled into above |
| `@codemirror/language-data` | ^6.5.1 | Syntax highlighting for fenced code blocks | bundled into above |
| `marked` | ^16.3.0 | Markdown parser (GFM) | `lib/marked.min.js` |
| `highlight.js` | ^11.11.1 | Code syntax highlighting | `lib/highlight.min.js` |
| `esbuild` | ^0.25.0 | Build tool (dev only) | — |

All npm dependencies are bundled by esbuild into self-contained IIFE files under `lib/`.

## npm pack dependency (obtained at build time)

| Library | Version | Source | Bundle output |
|---------|---------|--------|---------------|
| mermaid | 11.4.1 | npm registry via `npm pack` | `lib/mermaid.min.js` |

Mermaid is obtained via `npm pack mermaid@VERSION` rather than `npm install` to avoid its transitive dependency chain (`chevrotain` -> `lodash-es`) which carries known vulnerabilities that don't affect runtime but would flag in `npm audit`. The `npm pack` command downloads only the published package tarball without resolving transitive dependencies. The pre-built `dist/mermaid.min.js` is extracted from the tarball and verified against a pinned SHA-256 hash.

**Integrity verification:** `build.mjs` enforces SHA-256 verification via the `MERMAID_SHA256` constant. The build will **fail** if this constant is null. Use `npm run build:pin-hash` to obtain the hash when updating mermaid.

## Build process

```cmd
npm install            # install npm dependencies (0 audit vulnerabilities expected)
npm run build          # bundle CM6 + marked + hljs, obtain mermaid via npm pack, copy CSS
npm run build:pin-hash # download mermaid and print SHA-256 for pinning
```

Build outputs (`lib/`, `css/github-highlight.css`) are gitignored and regenerated from source.

## Update policy

- **Security patches**: Apply within 7 days of advisory publication.
- **Minor/patch releases**: Review quarterly. Update if changelog includes relevant fixes.
- **Major releases**: Evaluate API compatibility before adopting.

## Update workflow

1. Update version in `package.json` (npm deps) or `MERMAID_VERSION` in `build.mjs`.
2. Run `npm install && npm audit` — must show 0 vulnerabilities.
3. For mermaid updates:
   a. Set `MERMAID_SHA256 = null` in `build.mjs`.
   b. Run `npm run build:pin-hash` to download and obtain the new hash.
   c. Set `MERMAID_SHA256` to the printed hash in `build.mjs`.
4. Run `npm run build` to verify the full build passes with the pinned hash.
5. Verify: markdown render, code highlighting, mermaid diagrams, editor modes, download.
