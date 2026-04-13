# Bug 2: Lightbox Escape Listener Leak

## What this tests

Opening an image lightbox and closing it by **clicking** (not Escape) should properly clean up the keyboard listener. Previously, each click-to-close left an orphaned `keydown` listener on the document.

## How to test

### Images for lightbox testing

Click each image to open the lightbox, then close it using the method described:

#### Test A: Close with Escape key (always worked)

![Test image A](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKzSURBVHic7d0xbhRBEIXhf0dCIiAiIeAIOAI5B+AGHIErcAQyIhIiAiSQuP3snpmd7qnq7vfJK++yu/P82DU7I20CAAAAAAAAAAAAAIAOP5UuANH+KF0Aov1ZugBE+6t0AYh2Kl0Aop1LF4BoF6ULQLRL6QIQ7Z/SBSDKP0sXgGj/li4A0a6lC0C0G+kCEO1WugBEu5MuANHupQtAtAfpAhDtUboARHuSLgDRnqULQLQX6QIQ7VW6AER7ky4A0d6lC0C0D+kCEO1TugBE+5QuANE+pQtAtC/pAhDta7oARPuWLgDRvqcLQLQf6QIQ7Ve6AET7nS4A0f5LF4BoLNIFINqlcAGIxvITbWORLgDRWKYLQDQW6QIQjVW6AERjlS4A0VilC0A01ukCEI1NugBEY5suANE4pAtANA7pAhCNY7oAROOULgDRWKcLQDQ26QIQjW26AERjly4A0dinC0A0DukCEI1jugBE45QuANF4pAtANJ7pAhCNV7oAROOdLgDR+KQLQPQhXQCifUoXgGhf0gUg2rd0AYj2PV0Aov1IF4Bov9IFINrvdAGIdildAKJdSheAaJfSBSDapXQBiMapdAGIxjldAKJxIV0AonEpXQCicS1dAKJxI10AonErXQCi3UsXgGgP0gUg2qN0AYj2JF0Aoj1LF4BoL9IFINqrdAGI9iZdAKK9SxeAaB/SBSDap3QBiPYlXQCifU0XgGjf0gUg2vd0AYj2I10Aov1KF4Bov9MFINp/6QIQ7VK6AES7ki4A0a6lC0C0G+kCEO1WugBEu5MuANHupQtAtAfpAhDtUboARHuSLgDRnqULQLQX6QIQ7VW6AER7ky4A0d6lC0C0D+kCEO1TugBE+5QuANG+pAtAtK/pAhDtW7oARPueLgDRfqQLAAAAAAAAAAAAAPj1P+gMnCn5G4jnAAAAAElFTkSuQmCC)

1. Click the image above to open lightbox
2. Press **Escape** to close
3. This should work (it always did)

---

#### Test B: Close by clicking overlay (this was the buggy path)

![Test image B](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGqSURBVHic7dAxAQAgDMCwgX/PYEOxJSj46e4ZyvxfB3jMkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkBhDYgyJMSTGkJgNjB8I3PVuWYUAAAAASUVORK5CYII=)

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
