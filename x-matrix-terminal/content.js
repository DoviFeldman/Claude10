// X Matrix Terminal — JS side:
//  1. inject [image N] / [video] links for posts whose media the CSS hides
//  2. hide X's sticky/fixed header bars ("Home" tabs, "Post" back bar) —
//     they're siblings of the timeline, so hiding them can't break scroll
//  3. emoji <img> tags are hidden by the CSS; splice their alt text back in
//     so no words go missing

(() => {
  "use strict";

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

  function scan() {
    hideStickyBars();
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

  scan();
})();
