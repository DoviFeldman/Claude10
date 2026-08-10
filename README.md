# Claude10 — X (Twitter) Chrome Extensions

Three Chrome extensions that restyle **x.com** / **twitter.com**. Each lives in
its own folder and is completely standalone — install whichever one you want
(enable only one at a time, since they overlap).

| Folder | Extension | What it does |
|---|---|---|
| `x-blackout/` | **X Blackout — Hidden Media** | Every image and video on the timeline is covered by a black box. Click a box to reveal the image; videos show a ▶ play button — click it and the video plays. |
| `x-text-mode/` | **X Text Mode** | Removes all visual UI — images, videos, profile pictures, icons — everywhere (timeline **and** post detail pages). Each post is just the author's name, then their text (with X's native "Show more"), plus an `Open image ↗` / `Open video ↗` link that opens the media in a new tab. Keeps X's normal font, layout, and dark mode; the side areas stay but show text only. |
| `x-matrix-terminal/` | **X Matrix Terminal** | Full green-on-black terminal. Sidebars, tab bar, icons, buttons, the Grok chip — gone. Tight left-aligned monospace lines with a `>` prompt before each poster's name, `[image]` / `[video]` links under the text, CRT scanlines, and a green scrollbar. A `user@x:~$ [post]` prompt sits top-left for composing (images included), with `[notifs]` and `[msgs]` top-right. **The only mobile-optimised extension of the three** — see below. |

## Mobile

**`x-matrix-terminal/` is the only extension optimised for mobile.** The other
two (`x-blackout/`, `x-text-mode/`) are desktop-only and have had no mobile
work done on them at all.

> **Convention:** any request to "update the Chrome extension for mobile" —
> or any mobile fix, mobile tweak, or mobile layout change described without
> naming a folder — refers to **`x-matrix-terminal/` only**, unless another
> extension is named explicitly.

What mobile mode does (viewports ≤ 700px): removes X's bottom tab bar, its
floating compose button and the top X-logo masthead; drops padding to the
screen edge; halves the scanline overlay; and drops the `[post]` prompt to
`~$ [post]`.

### The reserved top strip

Android browsers that put their toolbar at the **bottom** (Lemur, Samsung
Internet, Chrome in some modes) reserve roughly the top **48dp** of the
viewport for the swipe-down-to-reveal-toolbar gesture. Taps in that band
never reach the page, so anything pinned up there is dead — it looks
pressable and simply does nothing.

Everything pinned to the top therefore sits at **80px** (plus any safe-area
inset), which clears that band with room to spare:

- `[post]` / `[notifs]` / `[msgs]`, padded to ~38px tall for a real touch
  target;
- X's own compose/reply header — the one holding **Drafts**, the audience
  chip, and the send button that reads **Reply** when you're replying. It
  lives *above* the primary column, so the column's padding doesn't move it;
  `content.css` pushes the whole compose view down and `lowerPinnedBars()`
  additionally rewrites the bar's `top` when X pins it with
  `position: sticky` / `fixed`.

If a button is visible but tapping it does nothing on a given browser, this
strip is the first thing to suspect — raise the `80px` in the media query and
the `TOP_SAFE` constant in `content.js` together.

## Install (Load unpacked)

1. Download/clone this repo.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select ONE of the three folders
   (e.g. `x-blackout/`).
5. Open or refresh https://x.com.

To switch styles, disable the current one on `chrome://extensions` and load /
enable another.

## Why scrolling keeps working this time

X's timeline is **virtualized**: each post sits in an absolutely-positioned
`div[data-testid="cellInnerDiv"]` with `transform: translateY(…)`, inside a
container whose height X computes and re-measures. Scrolling breaks when an
extension hides or repositions those cells (or any ancestor of the timeline),
or touches `overflow`/`height` on `html`/`body`.

All three extensions deliberately avoid that:

- They only hide **siblings** of the timeline (left nav, right sidebar,
  sticky header bars) and **leaf content inside** each cell (images, icons,
  buttons).
- They never change position/transform/overflow on the timeline, its cells,
  or `html`/`body`.
- When hidden media changes a post's height, X re-measures the cell and
  re-flows the list on its own — so infinite scroll keeps loading and the
  page keeps scrolling in all three modes, including post detail pages.

## Posting from X Matrix Terminal

The `[post]` prompt top-left opens **X's own composer** rather than a
home-made form — clicking it triggers X's hidden compose entry point, so
posting, drafts, and image upload all run through X's real pipeline. The
composer is repainted as a terminal window: black, green, monospace, with the
media button reading `[+image]` and the send button reading `[ Post ]`. GIF /
poll / emoji / schedule / location are hidden to keep it clean.

`[notifs]` and `[msgs]` sit top-right in the same style and route through
X's own nav links, so they're SPA navigations, not page loads.

### The composer is a page on mobile, a dialog on desktop

This is the one thing to know before touching the CSS. On desktop, `/compose`
opens a `[role="dialog"]` in `#layers`, outside `main` — so the rules that
strip the reading view can't reach it. **On mobile there is no dialog**: X
renders `/compose` as a page inside `main`, which means a
`:not([role="dialog"] *)` guard doesn't protect it, and the composer's text
field, toolbar and image button all get stripped along with the timeline's.
The result is a compose screen you cannot type into — no text field, so
tapping never raises the keyboard.

So the composer hides are gated on `html.mx-compose`, a class `content.js`
sets from the URL, and the composer's root is tagged `.mx-composer` (the
dialog on desktop, `[data-testid="primaryColumn"]` on mobile). Every
composer style hangs off `.mx-composer`. Route-gating is the only thing that
works here, because on mobile the real composer and the inline timeline
composer are structurally identical.

### Empty media boxes

Hiding `[data-testid="tweetPhoto"]` isn't enough: X wraps media in
aspect-ratio boxes (`padding-bottom: 56%; height: 0`) that keep their height
once the `<img>` inside them is gone, leaving a tall empty black rectangle
under the post. `collapseMedia()` climbs from each media node up to the last
ancestor that holds no text, name, or injected `[image]` link, and hides that
whole subtree — so a quote-tweet keeps its text and loses only its picture.
The mark self-heals each pass, because X recycles timeline cells and a stale
hide-class would eventually blank out a plain-text post.

## Notes

- X ships DOM changes regularly; selectors are based on the current
  `data-testid` attributes (`tweet`, `tweetPhoto`, `videoComponent`,
  `User-Name`, `tweetText`, …). If X renames these, the extensions may need
  a selector refresh.
- Image links point at the original-resolution file
  (`…?format=jpg&name=orig`). Video files are served as blob streams that
  can't be deep-linked, so `Open video ↗` / `[video]` opens the post's own
  page in a new tab.
