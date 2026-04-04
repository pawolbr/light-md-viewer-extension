# Security Vulnerability Report — Light MD Viewer Extension

**Scope:** All extension source files (`manifest.json`, `background.js`, `content.js`, `viewer.js`)  
**Date:** 2026-04-03  
**Extension:** Light MD Viewer v1.0.0 (Chrome MV3)

---

## Executive Summary

The extension operates on `file://` URLs only, which limits remote attack surface. However, any malicious `.md` file opened locally (downloaded, cloned from a repo, received via email) becomes the attack vector. The primary risk area is the custom HTML sanitizer in `viewer.js`, which has confirmed bypass vectors.

---

## HIGH Severity

### 1. XSS via `xlink:href` sanitizer bypass

**File:** `viewer.js:117,129-139`

The sanitizer checks URL-bearing attributes against this map:

```js
var urlAttrs = { href: true, src: true, xlinkhref: true, formaction: true };
```

But `xlink:href` attributes arrive as `attr.name.toLowerCase()` = `"xlink:href"` (with the colon), which does **not** match the key `"xlinkhref"`. The `javascript:` check is never applied to this attribute.

**Proof of concept markdown:**

```markdown
<svg><a xlink:href="javascript:alert(document.cookie)"><rect width="200" height="200" fill="red"/></a></svg>
```

- `<svg>` and `<a>` are not in the blocked tags list
- The `xlink:href` attribute is not matched, so the `javascript:` check is skipped
- Clicking the rectangle executes arbitrary JavaScript

**Impact:** Full XSS in the context of a `file://` page — can read local files via `fetch('file:///...')` or `XMLHttpRequest` on some browser configurations, and access any extension APIs exposed to the page context.

**Fix:** Change the key to `"xlink:href"` or, better, normalize attribute names by stripping colons/namespaces before lookup.

---

### 2. Blocklist-based sanitization is structurally fragile

**File:** `viewer.js:101-115`

The sanitizer uses a **blocklist** of dangerous tags:

```js
var blockedTags = {
  SCRIPT: true, STYLE: true, IFRAME: true, OBJECT: true,
  EMBED: true, LINK: true, META: true, BASE: true,
  FORM: true, INPUT: true, BUTTON: true, TEXTAREA: true, SELECT: true
};
```

Tags **not** blocked that can be exploited:

| Tag | Risk |
|---|---|
| `<svg>` | Container for XSS vectors (`<animate>`, `<set>`, `<use>`, `<foreignObject>`) |
| `<math>` | Can contain `<annotation-xml>` with executable content in some parsers |
| `<details>`/`<summary>` | UI redressing; `ontoggle` is stripped but the structure itself enables phishing overlays |
| `<marquee>`, `<bgsound>` | Legacy tags with potential event handlers (stripped by `on*` check, but defense-in-depth is absent) |

While `on*` event handlers are stripped (line 131-133), a **single missed edge case** results in full XSS because there is no secondary defense layer.

**Fix:** Switch to an **allowlist** of permitted tags (e.g., `p, h1-h6, ul, ol, li, a, img, pre, code, blockquote, table, thead, tbody, tr, th, td, em, strong, del, hr, br, sup, sub, details, summary`).

---

## MEDIUM Severity

### 3. No Content Security Policy declared

**File:** `manifest.json`

The manifest does not declare a `content_security_policy` key. MV3 provides a default CSP for extension pages (`script-src 'self'; object-src 'self'`), but the extension injects scripts into `file://` pages via `<script>` elements (content.js:92-105), which run under the **page's** CSP — and `file://` pages have **none**.

If the sanitizer is bypassed, there is no CSP to block inline script execution.

**Fix:** While MV3 limits what you can set, consider using a `sandbox` page architecture or injecting a CSP `<meta>` tag into the rebuilt document head in `content.js`.

### 4. Mermaid library — unknown version, historical XSS surface

**File:** `lib/mermaid.min.js`, `DEPENDENCIES.md:13`

The mermaid version could not be determined from the minified bundle. Mermaid has had multiple XSS CVEs (e.g., CVE-2023-45809, CVE-2023-48312). The code passes user-controlled text content to `mermaid.run()`:

```js
div.textContent = block.textContent;  // safe assignment
mermaid.run();                         // mermaid parses and renders — internal XSS possible
```

While `textContent` assignment is safe, mermaid itself may interpret the diagram source in dangerous ways depending on its version and configuration.

**Fix:** Pin and document the mermaid version. Enable mermaid's `securityLevel: 'strict'` option. Update to latest.

### 5. Incomplete `data:` URI blocking

**File:** `viewer.js:138`

```js
if (urlAttrs[name] && (normalized.startsWith('javascript:') || normalized.startsWith('data:text/html'))) {
```

Only `data:text/html` is blocked. Other dangerous MIME types pass through:

- `data:application/xhtml+xml` — can contain executable scripts
- `data:image/svg+xml` — in non-`<img>` contexts, can execute scripts

Chrome currently blocks top-level navigation to `data:` URIs from most contexts, which mitigates many scenarios, but this is a browser behavior, not an extension guarantee.

**Fix:** Block all `data:` URIs in URL attributes, or allowlist only `data:image/(png|jpeg|gif|webp)`.

---

## LOW Severity

### 6. Vendored dependencies — supply-chain and staleness risk

**File:** `lib/*`, `DEPENDENCIES.md`

All 9 libraries are vendored as minified bundles with no lock file, no package manager, and truncated integrity hashes. CodeMirror 5.65.18 is EOL (CodeMirror 6 is current). Highlight.js 11.9.0 and marked 12.0.1 may have known issues in newer advisories.

**Fix:** Document exact upstream URLs in `DEPENDENCIES.md`. Store full SHA-256 hashes. Establish an update cadence.

### 7. Potential DoS via complex mermaid diagrams

**File:** `viewer.js:160-170`

A markdown file with many large mermaid diagrams or intentionally complex graph structures (e.g., deeply nested subgraphs) can freeze the browser tab. There is no limit on diagram count or complexity.

**Fix:** Limit the number of mermaid blocks processed (e.g., cap at 20) and/or add a size limit per diagram.

---

## Informational

### 8. Broad `file:///*` host permission

The extension requests access to all local files (`file:///*`). This is necessary for its functionality but means a compromised extension has full local file read access. Users should be aware of this trust boundary.

### 9. Script loading error handling continues silently

**File:** `content.js:99-102`

If a library fails to load, the extension continues loading subsequent scripts. A partial load (e.g., marked loads but mermaid doesn't) could produce unexpected behavior, though this is not directly exploitable.

### 10. Things done well

- `background.js`: Validates blob URL origin, sanitizes filenames, uses `saveAs: true` — solid.
- `content.js`: Uses `textContent`/`escapeHtml()` for DOM construction — correct.
- Data passing via JSON in a `<script type="application/json">` element — safe pattern.
- `beforeunload` guard for unsaved changes.
- `target="_blank"` links get `noopener noreferrer` added.

---

## Recommended Priority

| Priority | Item | Effort |
|---|---|---|
| **P0** | Fix `xlink:href` sanitizer bypass (#1) | Small — fix key name |
| **P0** | Switch sanitizer to allowlist (#2) | Medium — define tag + attribute allowlist |
| **P1** | Add mermaid `securityLevel: 'strict'` (#4) | Small — one config line |
| **P1** | Block all `data:` URIs in sanitizer (#5) | Small — change condition |
| **P2** | Inject CSP meta tag (#3) | Small — add `<meta>` in content.js |
| **P2** | Update vendored libraries (#6) | Medium — manual downloads + testing |
| **P3** | Cap mermaid diagram count (#7) | Small |
