# Bug 6: Download Blob URL Timeout

## What this tests

When a download request is made but the background service worker never responds, the blob URL and event listener should be cleaned up after a timeout (15 seconds) instead of leaking indefinitely.

## How to test

### Normal download path (should still work)

1. Click **Download** in the toolbar
2. A save dialog should appear
3. Save the file, confirm "Downloaded" status appears briefly
4. This tests the happy path is unbroken

### Simulating the timeout (developer test)

To verify the timeout cleanup works:

1. Open Chrome DevTools (F12) and go to the **Application** tab
2. Under **Service Workers**, find the Light MD Viewer worker
3. Click **Stop** to suspend the service worker
4. Click **Download** in the toolbar
5. Wait 15 seconds
6. The status should show **"Download timed out"** in red
7. No blob URL or event listener is leaked

### Alternative simulation

1. Open `chrome://extensions`
2. Reload the extension while this page is open (this kills the service worker)
3. Click **Download** on this page
4. After 15 seconds, "Download timed out" should appear

---

## Content to verify the file downloads correctly

This file contains various markdown elements to verify the downloaded .md file is complete:

### A list

- Item one
- Item two
- Item three

### A table

| Column A | Column B | Column C |
|----------|----------|----------|
| 1        | 2        | 3        |
| 4        | 5        | 6        |

### A code block

```bash
echo "If this is in the downloaded file, the content was captured correctly"
```

### A blockquote

> The download mechanism creates a blob URL, posts a message to the content script,
> which relays it to the background service worker for the actual download.
> If any link in this chain breaks, the timeout ensures cleanup.

## What the bug looked like before the fix

1. User clicks Download
2. Service worker is suspended/reloaded (normal MV3 behavior)
3. The response message never arrives
4. The blob URL is never revoked (memory leak)
5. The `message` event listener stays attached forever
6. No user feedback that the download failed
