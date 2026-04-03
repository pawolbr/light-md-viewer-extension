# Security Review (April 3, 2026)

This review covers the Chrome extension implementation in:
- `manifest.json`
- `content.js`
- `viewer.js`
- `background.js`

## Findings

### 1) Critical: Markdown-rendered HTML XSS risk (fixed)
**Where:** `viewer.js` markdown rendering path.

**Issue:** The extension rendered `marked.parse(...)` output directly into `innerHTML`. If a markdown file contains unsafe HTML (e.g., event handlers, script-bearing tags, or `javascript:` links), that HTML could execute in the viewer.

**Impact:** Script execution in the viewer page context and UI manipulation/phishing risk.

**Fix implemented:** Added `sanitizeHtml()` and now render markdown through `renderMarkdown()` which sanitizes output before injecting into the DOM.

---

### 2) Medium: Download message input validation missing (fixed)
**Where:** `background.js` message handler for `action: 'download'`.

**Issue:** The service worker accepted arbitrary URL and filename from message payload.

**Impact:** If a messaging path is abused, extension could trigger unexpected downloads and unsafe filenames.

**Fix implemented:**
- Restrict download URLs to `blob:`.
- Enforce string filename.
- Sanitize filename to remove path separators and invalid characters.

---

### 3) Medium: Broad host permissions (fixed)
**Where:** `manifest.json` `host_permissions` and `content_scripts.matches`.

**Issue:** Extension runs on all origins for markdown suffixes (`*://*/*.md`, etc.).

**Impact:** Increases attack surface and chance of interacting with untrusted content.

**Fix implemented:** Scope reduced to local files (`file:///*`) in `host_permissions`, `content_scripts.matches`, and `web_accessible_resources.matches`.

---

### 4) Low: Dependency provenance/version visibility (fixed)
**Where:** `lib/*.min.js` vendored third-party bundles.

**Issue:** Minified vendor files are included without an explicit lockfile or versions documented in repo.

**Impact:** Harder to assess known CVEs and patch cadence.

**Fix implemented:** Added `DEPENDENCIES.md` documenting vendored libraries, detectable versions, integrity fingerprints, and an update workflow.

## Overall posture after fixes
- High-risk DOM injection path has been reduced by client-side sanitization.
- Download pathway now includes basic payload validation.
- Remaining risk is primarily ongoing dependency patch cadence and periodic re-review.
