# Vendored Dependency Inventory

_Last updated: 2026-04-03_

This extension vendors minified browser libraries under `lib/`. All files must be sourced from official upstream releases only.

## Inventory

| File | Library | Vendored version | Latest upstream | Source URL |
|---|---|---|---|---|
| `lib/marked.min.js` | marked | 12.0.1 | 17.0.5 | https://cdn.jsdelivr.net/npm/marked@12.0.1/marked.min.js |
| `lib/highlight.min.js` | highlight.js | 11.9.0 | 11.11.1 | https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js |
| `lib/mermaid.min.js` | mermaid | 11.14.0 | 11.14.0 | https://cdn.jsdelivr.net/npm/mermaid@11.14.0/dist/mermaid.min.js |
| `lib/codemirror.min.js` | CodeMirror 5 | 5.65.18 | 5.65.21 (EOL) | https://cdn.jsdelivr.net/npm/codemirror@5.65.18/lib/codemirror.min.js |
| `lib/codemirror-markdown.min.js` | CodeMirror markdown mode | 5.65.18 | 5.65.21 | https://cdn.jsdelivr.net/npm/codemirror@5.65.18/mode/markdown/markdown.min.js |
| `lib/codemirror-gfm.min.js` | CodeMirror GFM mode | 5.65.18 | 5.65.21 | https://cdn.jsdelivr.net/npm/codemirror@5.65.18/mode/gfm/gfm.min.js |
| `lib/codemirror-overlay.min.js` | CodeMirror overlay addon | 5.65.18 | 5.65.21 | https://cdn.jsdelivr.net/npm/codemirror@5.65.18/addon/mode/overlay.min.js |
| `lib/codemirror-xml.min.js` | CodeMirror XML mode | 5.65.18 | 5.65.21 | https://cdn.jsdelivr.net/npm/codemirror@5.65.18/mode/xml/xml.min.js |
| `lib/codemirror-continuelist.min.js` | CodeMirror markdown list addon | 5.65.18 | 5.65.21 | https://cdn.jsdelivr.net/npm/codemirror@5.65.18/addon/edit/continuelist.min.js |

### Notes

- **CodeMirror 5** is end-of-life; 6.x is a full rewrite with a different API. Migration is a separate effort — track remaining 5.x patch releases (5.65.21) for security fixes.
- **marked** has a large version gap (12 -> 17). Review the changelog for breaking changes and security advisories before upgrading.

## SHA-256 integrity hashes

Regenerate with: `sha256sum lib/*.min.js`

```
b5eebc7db4f99b071ee900d420b86bcef8e2bea853f065b004e40519749e1d2b  lib/codemirror-continuelist.min.js
f34f273fc3cb90d1be6556b9588e388aade167e11ee635f8b9637241b3788241  lib/codemirror-gfm.min.js
6d31310a4719d151d198b604864fa7cb7dcaa5013888863585e06d7c7085f3d8  lib/codemirror-markdown.min.js
2d2fc6f219c5ec536fe6bfe38fa241a8aba9045cf79b6e3599c906995644487b  lib/codemirror-overlay.min.js
1403f6fc04264c38e933891710636ed07761898aa764de95a39a832d433cbe66  lib/codemirror-xml.min.js
5df4d971e24aea483bf8ed5b48e026f3806792436ef29b1248aef7c754d161f9  lib/codemirror.min.js
837a6fa5b0c736b52bbde2b2b6190f305da3fc9ed41681db5321507057b5c846  lib/highlight.min.js
cb4cf2efefd2b1f602bf2f27d594fc0a26340d2661b60cddfcaac7a7b9261886  lib/marked.min.js
217b66ef4279c33c141b4afe22effad10a91c02558dc70917be2c0981e78ed87  lib/mermaid.min.js
```

## Update and verification workflow

1. Check for new releases and security advisories for each library.
2. Download the new minified file from the **Source URL** column (updating the version in the URL).
3. Update the version, latest upstream, source URL, and SHA-256 hash in this file.
4. Verify basic extension behavior:
   - Markdown render
   - Mermaid diagram render
   - Editor mode and list continuation
   - Download flow
5. Run `node --check` on `content.js`, `viewer.js`, and `background.js`.
6. Commit with a message noting which libraries were updated and why.

## Update policy

- **Security patches**: Apply within 7 days of advisory publication.
- **Minor/patch releases**: Review quarterly. Update if changelog includes relevant fixes.
- **Major releases**: Evaluate API compatibility before adopting. Document breaking changes.
