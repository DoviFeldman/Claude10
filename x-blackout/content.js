// X Blackout — covers timeline images/videos with a black box.
// Click reveals the image; videos get a play button that starts playback.
//
// X virtualizes its timeline (cells are absolutely positioned and recycled),
// so covered elements come and go. We only ever ADD an overlay inside the
// media container — we never move, hide, or resize timeline cells, which is
// what breaks scrolling.

(() => {
  "use strict";

  const MEDIA_SELECTOR = [
    '[data-testid="videoComponent"]',
    '[data-testid="tweetPhoto"]',
    '[data-testid="testCondensedMedia"]',
    '[data-testid="card.layoutLarge.media"]',
    '[data-testid="card.layoutSmall.media"]'
  ].join(",");

  function isVideo(el) {
    return !!(
      el.matches('[data-testid="videoComponent"]') ||
      el.closest('[data-testid="videoComponent"]') ||
      el.querySelector(
        'video, [data-testid="playButton"], [data-testid="previewInterstitial"]'
      )
    );
  }

  // While a video is covered, keep it paused (X likes to autoplay).
  // Media "play" events don't bubble, but capture-phase listeners on an
  // ancestor still see them.
  function keepPausedWhileCovered(container, overlay) {
    container.querySelectorAll("video").forEach((v) => {
      try {
        v.pause();
      } catch (_) {}
    });
    container.addEventListener(
      "play",
      (e) => {
        if (overlay.isConnected && e.target && e.target.pause) {
          e.target.pause();
        }
      },
      true
    );
  }

  function cover(el) {
    el.dataset.xblkDone = "1";
    const video = isVideo(el);

    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    const overlay = document.createElement("div");
    overlay.className = "xblk-overlay";
    overlay.setAttribute("role", "button");
    overlay.setAttribute("tabindex", "0");
    overlay.setAttribute(
      "aria-label",
      video ? "Hidden video — click to play" : "Hidden image — click to reveal"
    );

    if (video) {
      const btn = document.createElement("div");
      btn.className = "xblk-play";
      overlay.appendChild(btn);
      keepPausedWhileCovered(el, overlay);
    }

    const reveal = (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      el.dataset.xblkRevealed = "1";
      if (video) {
        const v = el.querySelector("video");
        if (v) {
          v.play().catch(() => {
            const pb = el.querySelector('[data-testid="playButton"]');
            if (pb) pb.click();
          });
        } else {
          const pb = el.querySelector('[data-testid="playButton"]');
          if (pb) pb.click();
        }
      }
    };

    overlay.addEventListener("click", reveal);
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") reveal(e);
    });

    el.appendChild(overlay);
  }

  function scan() {
    document.querySelectorAll(MEDIA_SELECTOR).forEach((el) => {
      if (el.dataset.xblkRevealed) return;

      // A photo container nested inside a (still covered) video container is
      // already handled by the outer overlay — don't double-cover.
      const outer = el.parentElement && el.parentElement.closest(MEDIA_SELECTOR);
      if (outer && !outer.dataset.xblkRevealed) return;

      // React re-renders can drop our overlay while keeping the element —
      // re-cover in that case.
      if (el.dataset.xblkDone && el.querySelector(":scope > .xblk-overlay")) {
        return;
      }
      cover(el);
    });
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scan();
})();
