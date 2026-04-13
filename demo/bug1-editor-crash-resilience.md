# Bug 1: Editor Crash Resilience

## What this tests

If the CodeMirror editor fails to initialize, the viewer should still render markdown in read-only mode instead of showing a blank page.

## How to test

This file itself is the test. If you can read this, the **view mode** is working.

### Steps

1. Open this file in Chrome with the extension loaded
2. Confirm the rendered view displays correctly (you're reading it now)
3. Click **Edit** - it should either open the editor or show the button as disabled with tooltip "Editor unavailable"
4. Click **Split** - same behavior as Edit
5. The toolbar, dark mode toggle, copy buttons, and download should all work regardless of editor state

### Simulating the crash (developer test)

To force-test the crash path, temporarily break the editor bundle:

1. Rename `lib/codemirror-bundle.js` to `lib/codemirror-bundle.js.bak`
2. Create an empty `lib/codemirror-bundle.js` with just: `throw new Error('test crash');`
3. Open this file - the viewer should still render, Edit/Split should be disabled
4. Restore the original file after testing

## Content to verify rendering works

Here's a table:

| Feature | Expected |
|---------|----------|
| View mode | Works normally |
| Edit button | Disabled with tooltip |
| Split button | Disabled with tooltip |
| Dark mode | Works |
| Copy MD | Works |
| Download | Works |

Here's a code block:

```javascript
// This should have syntax highlighting even without the editor
function greet(name) {
  return `Hello, ${name}!`;
}
```

> Blockquote: The viewer must never show a blank page just because the editor component failed.
