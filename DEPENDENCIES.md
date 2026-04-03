# Vendored Dependency Inventory

_Last updated: April 3, 2026_

This extension vendors minified browser libraries under `lib/`.

## Inventory

| File | Library | Version status | Provenance notes |
|---|---|---|---|
| `lib/marked.min.js` | marked | `12.0.1` (detected from bundle text) | Markdown parser used by `viewer.js`. |
| `lib/highlight.min.js` | highlight.js | `11.9.0` (detected from bundle text) | Syntax highlighting. |
| `lib/mermaid.min.js` | mermaid | Version not confidently extracted from minified payload | Diagram rendering runtime. |
| `lib/codemirror.min.js` | CodeMirror core | `5.65.18` (detected from bundle text) | Editor runtime for markdown editing. |
| `lib/codemirror-markdown.min.js` | CodeMirror markdown mode | Version inherited from CodeMirror bundle set (exact plugin version not embedded) | Markdown mode support. |
| `lib/codemirror-gfm.min.js` | CodeMirror GFM mode | Version inherited from CodeMirror bundle set (exact plugin version not embedded) | GFM mode overlay. |
| `lib/codemirror-overlay.min.js` | CodeMirror overlay addon | Version inherited from CodeMirror bundle set (exact plugin version not embedded) | Overlay support dependency. |
| `lib/codemirror-xml.min.js` | CodeMirror XML mode | Version inherited from CodeMirror bundle set (exact plugin version not embedded) | XML mode dependency. |
| `lib/codemirror-continuelist.min.js` | CodeMirror markdown list addon | Version inherited from CodeMirror bundle set (exact plugin version not embedded) | Continue-list behavior for markdown. |

## Update and verification workflow

1. Source files only from official upstream releases.
2. Record upstream source URL and release tag/version in this file when updating.
3. Regenerate or replace minified assets from that release.
4. Verify basic extension behavior:
   - markdown render
   - mermaid render
   - editor mode and list continuation
   - download flow
5. Run static checks (`node --check`) for extension scripts touched by dependency integration changes.

## Integrity fingerprints (current workspace)

- `lib/codemirror-continuelist.min.js`: `b5eebc7db4f99b07...`
- `lib/codemirror-gfm.min.js`: `f34f273fc3cb90d1...`
- `lib/codemirror-markdown.min.js`: `6d31310a4719d151...`
- `lib/codemirror-overlay.min.js`: `2d2fc6f219c5ec53...`
- `lib/codemirror-xml.min.js`: `1403f6fc04264c38...`
- `lib/codemirror.min.js`: `5df4d971e24aea48...`
- `lib/highlight.min.js`: `837a6fa5b0c736b5...`
- `lib/marked.min.js`: `cb4cf2efefd2b1f6...`
- `lib/mermaid.min.js`: `217b66ef4279c33c...`
