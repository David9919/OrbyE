(() => {
  function go(hash) {
    if (!hash) return;
    if (!hash.startsWith("#")) hash = "#" + hash;
    const id = hash.slice(1);
    const el = document.getElementById(id);
    if (el) {
      location.hash = hash;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // mark sidebar
      document.querySelectorAll(".gs-item").forEach(a => {
        a.classList.toggle("active", a.getAttribute("href") === hash || a.dataset.gs === id);
      });
    } else {
      location.hash = hash;
    }
  }

  document.addEventListener("click", e => {
    const a = e.target.closest("a[href^='#']");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    // let CSS :target panels work (no preventDefault)
    if (href.indexOf("#panel-") === 0) return;
    // sidebar + internal links
    if (a.classList.contains("gs-item") || a.closest(".top-mini-nav") || a.closest(".home-dashboard") || a.closest(".mission-cta") || a.closest(".trailer-actions")) {
      e.preventDefault();
      go(href);
    }
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id && document.getElementById(id)) {
      document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // initial
  if (location.hash) {
    setTimeout(() => go(location.hash), 100);
  }
})();
