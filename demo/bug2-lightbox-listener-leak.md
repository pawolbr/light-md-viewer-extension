# Bug 2: Lightbox Escape Listener Leak

## What this tests

Opening an image lightbox and closing it by **clicking** (not Escape) should properly clean up the keyboard listener. Previously, each click-to-close left an orphaned `keydown` listener on the document.

## How to test

### Images for lightbox testing

Click each image to open the lightbox, then close it using the method described:

#### Test A: Close with Escape key (always worked)

![Test image A](https://ourhappybackyardfarm.com/wp-content/uploads/2022/03/how-to-boil-an-egg-fi-720x720.png)

1. Click the image above to open lightbox
2. Press **Escape** to close
3. This should work (it always did)

---

#### Test B: Close by clicking overlay (this was the buggy path)

![Test image B](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUzxnbM3Zq_0aHhi96t0J-jHY78SfSY6f4Ew&s)

1. Click the image above to open lightbox
2. **Click anywhere on the dark overlay** to close (do NOT use Escape)
3. Repeat steps 1-2 five more times (open and click-close)

---

#### Test C: Verify no accumulated listeners

After doing Test B multiple times:

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Press **Escape** - nothing should happen (no errors, no warnings)
4. With the fix, closing via click properly removes the Escape listener

### What the bug looked like before the fix

Each click-to-close left a `keydown` listener attached to `document`. After 10 open/click-close cycles, pressing Escape would fire 10 handlers trying to `.remove()` already-removed overlays. Harmless but wasteful.
