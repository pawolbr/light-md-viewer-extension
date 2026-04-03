# Light MD Viewer - Chrome Extension

A lightweight Chrome extension that renders Markdown files directly in the browser with syntax highlighting, mermaid diagrams, and a built-in editor.

## Features

- **View mode** — clean, readable rendering of `.md` files with Material Design styling
- **Edit mode** — full CodeMirror 6 editor with GFM syntax highlighting and line numbers
- **Split mode** — side-by-side editor and live preview
- **Code highlighting** — automatic syntax detection for fenced code blocks via highlight.js
- **Mermaid diagrams** — flowcharts, sequence diagrams, and more rendered inline
- **Export options** — download edited files, copy raw markdown or rendered HTML to clipboard
- **Fully offline** — all libraries are bundled locally, no network requests

## Installation

### From Chrome Web Store

_(Coming soon)_

### Manual (unpacked)

1. Clone or download this repository
2. Install dependencies and build:
   ```cmd
   npm install
   npm run build
   ```
3. Open `chrome://extensions/` in Chrome
4. Enable **Developer mode** (top right toggle)
5. Click **Load unpacked** and select the extension folder
6. **Important:** Click **Details** on the extension card and enable **Allow access to file URLs**

## Usage

Open any `.md` or `.markdown` file in Chrome — it will render automatically.

- **View / Edit / Split** — toggle between modes using the toolbar buttons
- **Ctrl+S** (or Cmd+S on Mac) — download the edited file
- **Copy MD** — copy raw markdown to clipboard (available in Edit/Split modes)
- **Copy HTML** — copy rendered HTML to clipboard (available in Split mode)

## Development

### Prerequisites

- Node.js 18+
- npm

### Build

```cmd
npm install        # install dependencies (0 audit vulnerabilities expected)
npm run build      # bundle libraries and download mermaid
```

Build outputs go to `lib/` and `css/github-highlight.css`. These are gitignored and regenerated from source.

### Watch mode

```cmd
npm run build:watch
```

Rebuilds the CodeMirror, marked, and highlight.js bundles on file changes.

### Project structure

```
manifest.json          Extension manifest (Manifest V3)
background.js          Service worker (handles file downloads)
content.js             Content script (detects .md files, injects viewer)
viewer.js              App logic (rendering, editing, modes, export)
css/viewer.css         Viewer styles
src/
  editor.js            CodeMirror 6 editor bundle source
  marked-global.js     marked.js browser global wrapper
  hljs-global.js       highlight.js browser global wrapper
build.mjs              Build script (esbuild + mermaid CDN download)
```

### Updating dependencies

See [DEPENDENCIES.md](DEPENDENCIES.md) for the full dependency inventory, update policy, and verification workflow.

## Security

- All libraries bundled locally — no remote code loading
- HTML sanitizer with tag allowlist strips unsafe elements from rendered output
- Content Security Policy injected on every page to restrict script sources
- Input validation on all message passing between content script and service worker
- `npm audit` clean (0 vulnerabilities)
- Scoped to `file://` URLs only — no access to web browsing data

## License

MIT
