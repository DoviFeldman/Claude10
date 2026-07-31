// X Matrix Terminal — JS side:
//  1. inject [image N] / [video] links for posts whose media the CSS hides
//  2. hide X's sticky/fixed header bars ("Home" tabs, "Post" back bar) —
//     they're siblings of the timeline, so hiding them can't break scroll
//  3. emoji <img> tags are hidden by the CSS; splice their alt text back in
//     so no words go missing
//  4. mount the top-left [post] prompt, which opens X's own compose dialog
//     (so real posting + image upload keep working) restyled as a terminal
//  5. evict the floating Grok button, and on phones the bottom tab bar and
//     the X-logo masthead

(() => {
  "use strict";

  const PHONE = () => window.matchMedia("(max-width: 700px)").matches;

  function origUrl(src) {
    try {
      const u = new URL(src);
      u.searchParams.set("name", "orig");
      return u.href;
    } catch (_) {
      return src;
    }
  }

  function permalink(article) {
    const time = article.querySelector('a[href*="/status/"] time');
    if (time) {
      const a = time.closest("a");
      if (a) return a.href;
    }
    if (/\/status\/\d+/.test(location.pathname)) return location.href;
    return null;
  }

  function makeLink(href, label) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    return a;
  }

  function processArticle(article) {
    const imgs = [
      ...new Set(
        [...article.querySelectorAll('img[src*="pbs.twimg.com/media"]')].map(
          (img) => origUrl(img.src)
        )
      )
    ];
    const hasVideo = !!article.querySelector(
      '[data-testid="videoComponent"], video, [data-testid="playButton"], a[href*="/video/"]'
    );

    const sig = imgs.join("|") + (hasVideo ? "|video" : "");
    const existing = article.querySelector(".mx-media-links");
    if (article.dataset.mxSig === sig && (existing || sig === "")) return;
    article.dataset.mxSig = sig;
    if (existing) existing.remove();
    if (!imgs.length && !hasVideo) return;

    const box = document.createElement("div");
    box.className = "mx-media-links";
    imgs.forEach((url, i) => {
      box.appendChild(makeLink(url, imgs.length > 1 ? `[image ${i + 1}]` : "[image]"));
    });
    if (hasVideo) {
      const link = permalink(article);
      if (link) box.appendChild(makeLink(link, "[video]"));
    }

    const text = article.querySelector('[data-testid="tweetText"]');
    if (text && text.parentElement) {
      text.parentElement.insertBefore(box, text.nextSibling);
    } else {
      article.appendChild(box);
    }
  }

  // X's "Home" tab bar / "Post" back bar sit sticky or fixed near the top of
  // the primary column. They are siblings of the scrolling timeline — never
  // ancestors — so display:none on them is scroll-safe.
  function hideStickyBars() {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    if (!col) return;
    col
      .querySelectorAll(
        ":scope > div, :scope > div > div, :scope > div > div > div"
      )
      .forEach((el) => {
        if (el.classList.contains("mx-hidden")) return;
        if (el.querySelector('[data-testid="cellInnerDiv"], article')) return;
        const pos = getComputedStyle(el).position;
        if (pos === "sticky" || pos === "fixed") {
          el.classList.add("mx-hidden");
        }
      });
  }

  // Walk up from a doomed node to the floating wrapper X positioned it in, so
  // we hide the whole chip instead of leaving an empty fixed box behind.
  // Never climbs past anything that holds the timeline or a live dialog.
  function hideFloatingWrapper(node) {
    let el = node;
    for (let i = 0; el && el !== document.body && i < 6; i++) {
      if (el.querySelector('[data-testid="cellInnerDiv"], article, [role="dialog"]')) {
        break;
      }
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "absolute" || pos === "sticky") {
        el.classList.add("mx-hidden");
        return;
      }
      el = el.parentElement;
    }
    node.classList.add("mx-hidden");
  }

  // The Grok chip lives bottom-right in #layers, outside main. Anything
  // inside a post is left alone — a @grok mention is not chrome.
  function hideGrok() {
    document
      .querySelectorAll(
        '[aria-label="grok" i]:not(.mx-hidden), [aria-label^="grok " i]:not(.mx-hidden), [data-testid*="grok" i]:not(.mx-hidden), a[href*="/i/grok" i]:not(.mx-hidden)'
      )
      .forEach((el) => {
        if (el.closest('article, [data-testid="cellInnerDiv"]')) return;
        hideFloatingWrapper(el);
      });
  }

  // Phones only: the bottom tab bar and the X-logo masthead.
  function hideMobileChrome() {
    if (!PHONE()) return;

    const tab = document.querySelector(
      '[data-testid="AppTabBar_Home_Link"], [data-testid="BottomBar"]'
    );
    // on desktop the same testids live in the (already hidden) left nav
    if (tab && !tab.closest('header[role="banner"]') && !tab.closest(".mx-hidden")) {
      hideFloatingWrapper(tab);
    }

    const logo = document.querySelector(
      '[data-testid="TopNavBar"], main [aria-label="X"], header [aria-label="X"]'
    );
    if (logo && !logo.classList.contains("mx-hidden")) {
      hideFloatingWrapper(logo);
    }
  }

  // Emoji images live on abs-0.twimg.com and are display:none'd by our CSS.
  // Insert their alt text next to them (we don't remove the node itself —
  // yanking React-owned DOM crashes X's renderer).
  function restoreEmojis() {
    document
      .querySelectorAll('main img[src*="emoji"]:not([data-mx-emoji])')
      .forEach((img) => {
        img.setAttribute("data-mx-emoji", "1");
        const alt = img.getAttribute("alt");
        if (alt) img.insertAdjacentText("afterend", alt);
      });
  }

  // Open X's real composer. Clicking X's own (hidden) compose entry point
  // keeps SPA routing and the upload pipeline intact, so images work; the
  // href fallback covers pages where that button isn't rendered.
  function openComposer() {
    const entry = document.querySelector(
      '[data-testid="SideNav_NewTweet_Button"], a[href="/compose/post"], a[href="/compose/tweet"]'
    );
    if (entry) {
      entry.click();
      return;
    }
    location.assign("/compose/post");
  }

  function mountPostButton() {
    if (document.getElementById("mx-post-btn")) return;
    const btn = document.createElement("button");
    btn.id = "mx-post-btn";
    btn.type = "button";
    btn.textContent = "[post]";
    btn.title = "Compose a post (images supported)";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openComposer();
    });
    document.body.appendChild(btn);
  }

  // The composer's media button is icon-only. Tag it so the CSS can print
  // "[+image]" instead — found via the file input, so it survives an
  // aria-label rename.
  function labelComposer() {
    document
      .querySelectorAll('[data-testid="fileInput"]:not([data-mx-labelled])')
      .forEach((input) => {
        input.setAttribute("data-mx-labelled", "1");
        const btn = input.parentElement?.querySelector('[role="button"], button');
        if (btn) btn.classList.add("mx-media-btn");
      });
  }

  function scan() {
    mountPostButton();
    labelComposer();
    hideStickyBars();
    hideGrok();
    hideMobileChrome();
    restoreEmojis();
    document
      .querySelectorAll('article[data-testid="tweet"]')
      .forEach(processArticle);
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("resize", scan, { passive: true });

  scan();
})();
