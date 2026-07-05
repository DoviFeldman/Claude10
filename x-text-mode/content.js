// X Text Mode — for every post that had media (now hidden by content.css),
// inject plain links that open the image (full resolution) or the video's
// post page in a new tab.

(() => {
  "use strict";

  // https://pbs.twimg.com/media/XXXX?format=jpg&name=small -> name=orig
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
    // On a post's own detail page the timestamp isn't a link.
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

    // Media renders lazily, so re-check each pass and rebuild if it changed
    // (or if a React re-render dropped our links).
    const sig = imgs.join("|") + (hasVideo ? "|video" : "");
    const existing = article.querySelector(".xtm-media-links");
    if (article.dataset.xtmSig === sig && (existing || sig === "")) return;
    article.dataset.xtmSig = sig;
    if (existing) existing.remove();
    if (!imgs.length && !hasVideo) return;

    const box = document.createElement("div");
    box.className = "xtm-media-links";
    imgs.forEach((url, i) => {
      box.appendChild(
        makeLink(url, imgs.length > 1 ? `Open image ${i + 1} ↗` : "Open image ↗")
      );
    });
    if (hasVideo) {
      const link = permalink(article);
      if (link) box.appendChild(makeLink(link, "Open video ↗"));
    }

    // Put the links just above the reply/repost/like row; it exists on both
    // the timeline and the post detail page.
    const group = article.querySelector('[role="group"]');
    if (group && group.parentElement) {
      group.parentElement.insertBefore(box, group);
    } else {
      article.appendChild(box);
    }
  }

  function scan() {
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
