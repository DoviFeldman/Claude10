# Claude10 — X (Twitter) Chrome Extensions

Three Chrome extensions that restyle **x.com** / **twitter.com**. Each lives in
its own folder and is completely standalone — install whichever one you want
(enable only one at a time, since they overlap).

| Folder | Extension | What it does |
|---|---|---|
| `x-blackout/` | **X Blackout — Hidden Media** | Every image and video on the timeline is covered by a black box. Click a box to reveal the image; videos show a ▶ play button — click it and the video plays. |
| `x-text-mode/` | **X Text Mode** | Removes all visual UI — images, videos, profile pictures, icons — everywhere (timeline **and** post detail pages). Each post is just the author's name, then their text (with X's native "Show more"), plus an `Open image ↗` / `Open video ↗` link that opens the media in a new tab. Keeps X's normal font, layout, and dark mode; the side areas stay but show text only. |
| `x-matrix-terminal/` | **X Matrix Terminal** | Full green-on-black terminal. Sidebars, tab bar, icons, buttons, the Grok chip — gone. Tight left-aligned monospace lines with a `>` prompt before each poster's name, `[image]` / `[video]` links under the text, CRT scanlines, and a green scrollbar. A `user@x:~$ [post]` prompt sits top-left for composing (images included). Mobile-optimised. The page scrolls normally — see note below. |

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

The `[post]` prompt in the top-left opens **X's own compose dialog** rather
than a home-made form — clicking it triggers X's hidden compose entry point,
so posting, drafts, and image upload all run through X's real pipeline and
keep working. The dialog is repainted as a terminal window: black, green,
monospace, with the media button reading `[+image]` and the send button
reading `[ Post ]`. GIF / poll / emoji / schedule / location buttons are
hidden to keep it clean.

On phones (`max-width: 700px`) the bottom tab bar, the floating compose FAB,
and the top X-logo masthead are all removed, padding shrinks to the screen
edge, and the scanline overlay is halved — the `[post]` prompt collapses to
`~$ [post]`.

## Notes

- X ships DOM changes regularly; selectors are based on the current
  `data-testid` attributes (`tweet`, `tweetPhoto`, `videoComponent`,
  `User-Name`, `tweetText`, …). If X renames these, the extensions may need
  a selector refresh.
- Image links point at the original-resolution file
  (`…?format=jpg&name=orig`). Video files are served as blob streams that
  can't be deep-linked, so `Open video ↗` / `[video]` opens the post's own
  page in a new tab.
