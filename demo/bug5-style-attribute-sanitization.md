# Bug 5: Style Attribute Sanitization

## What this tests

Inline `style` attributes in HTML tags should be stripped by the sanitizer to prevent CSS-based UI spoofing. This is important because the extension targets non-technical users who might open untrusted markdown files.

## How to test

### Test A: Phishing overlay (should be neutralized)

The div below attempts to create a fixed overlay covering the entire page. With the fix, the `style` attribute is stripped and it renders as normal inline content:

<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column">
<h1 style="color:red;font-size:3em">SECURITY UPDATE REQUIRED</h1>
<p style="font-size:1.5em">Download the critical update from totally-not-malware.com</p>
</div>

If you can still see the toolbar and this surrounding text, the fix works.

---

### Test B: Hidden content attack (should be neutralized)

This paragraph tries to hide itself: <span style="display:none">SECRET HIDDEN TEXT - you should be able to see this now</span>

With the fix, the `display:none` style is stripped and the text becomes visible.

---

### Test C: Opacity trick (should be neutralized)

<span style="opacity:0;position:absolute">INVISIBLE OVERLAY TEXT</span>

This text tries to be invisible. With the fix, it should appear as normal text.

---

### Test D: Legitimate formatting (still works via CSS classes)

Regular markdown formatting is unaffected by stripping `style` attributes:

- **Bold text** works
- *Italic text* works
- `Inline code` works
- [Links](#) work
- > Blockquotes work

```
Code blocks work
```

| Tables | Work |
|--------|------|
| Yes | They do |

---

## What the bug looked like before the fix

1. The div in Test A would cover the ENTIRE page with a fake "security update" message
2. The real toolbar, content, and controls would be completely hidden
3. Non-technical users could be tricked into visiting malicious URLs
4. The `style` attribute was not in the sanitizer's strip list alongside `on*` event handlers
