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

## CDN dependency (downloaded at build time)

| Library | Version | Source | Bundle output |
|---------|---------|--------|---------------|
| mermaid | 11.4.1 | cdnjs.cloudflare.com | `lib/mermaid.min.js` |

Mermaid is kept out of npm to avoid its transitive dependency chain (`chevrotain` -> `lodash-es`) which carries known vulnerabilities that don't affect runtime but would flag in `npm audit`. The pre-built dist file has no runtime dependency on `lodash-es`.

**Integrity verification:** `build.mjs` supports SHA-256 pinning via the `MERMAID_SHA256` constant. After the first download, pin the printed hash to verify subsequent downloads.

## Build process

```cmd
npm install        # install npm dependencies (0 vulnerabilities expected)
npm run build      # bundle CM6 + marked + hljs, download mermaid, copy CSS
```

Build outputs (`lib/`, `css/github-highlight.css`) are gitignored and regenerated from source.

## Update policy

- **Security patches**: Apply within 7 days of advisory publication.
- **Minor/patch releases**: Review quarterly. Update if changelog includes relevant fixes.
- **Major releases**: Evaluate API compatibility before adopting.

## Update workflow

1. Update version in `package.json` (npm deps) or `MERMAID_VERSION` in `build.mjs`.
2. Run `npm install && npm audit` — must show 0 vulnerabilities.
3. Run `npm run build` (use `--force` flag to re-download mermaid).
4. Pin the new mermaid SHA-256 hash in `build.mjs` if updated.
5. Verify: markdown render, code highlighting, mermaid diagrams, editor modes, download.
