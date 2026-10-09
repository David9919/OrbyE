(() => {
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function renderHome() {
    // Posts across spaces
    const postsEl = document.getElementById("homeTrendPosts");
    if (postsEl) {
      let posts = [];
      try {
        const all = JSON.parse(localStorage.getItem("orbye_space_posts_v2") || "{}");
        Object.values(all).forEach(list => { posts = posts.concat(list || []); });
      } catch {}
      posts.sort((a, b) => ((b.likes || 0) * 3 + (b.views || 0)) - ((a.likes || 0) * 3 + (a.views || 0)) || (b.ts || 0) - (a.ts || 0));
      posts = posts.slice(0, 5);
      postsEl.innerHTML = posts.length
        ? posts.map(p => `<a class="home-item" href="#comunidad"><b>${esc((p.text || "").slice(0, 80) || "Post")}</b><small>${esc(p.user)} · ♥ ${p.likes || 0}</small></a>`).join("")
        : '<p class="muted">Aún no hay posts. Sé el primero en la comunidad.</p>';
    }

    // Forum
    const forumEl = document.getElementById("homeTrendForum");
    if (forumEl) {
      let list = [];
      try { list = JSON.parse(localStorage.getItem("orbye_science_theories_v1") || "[]"); } catch {}
      list = list.slice(0, 5);
      forumEl.innerHTML = list.length
        ? list.map(t => `<a class="home-item" href="#foro-ciencia"><b>${esc(t.title)}</b><small>${esc(t.field)} · ${esc(t.user)} · ${(t.replies || []).length} respuestas</small></a>`).join("")
        : '<p class="muted">Sin discusiones todavía.</p>';
    }

    // Videos
    const vidEl = document.getElementById("homeTrendVideos");
    if (vidEl) {
      let vids = [];
      try { vids = JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || "[]"); } catch {}
      vids = vids.slice(0, 5);
      vidEl.innerHTML = vids.length
        ? vids.map(v => `<a class="home-item" href="#orbytube"><b>${esc(v.title)}</b><small>${esc(v.uploader)}</small></a>`).join("")
        : '<p class="muted">Sin videos aún. Sube uno en OrbyTube.</p>';
    }

    // News
    const newsEl = document.getElementById("homeTrendNews");
    if (newsEl) {
      let news = [];
      try { news = JSON.parse(localStorage.getItem("orbye_news_v1") || "[]"); } catch {}
      news = news.slice(0, 5);
      newsEl.innerHTML = news.length
        ? news.map(n => `<a class="home-item" href="#noticias"><b>${esc(n.title)}</b><small>${esc(n.user)}</small></a>`).join("")
        : '<p class="muted">Sin noticias todavía.</p>';
    }
  }

  // Sidebar active state + more menu
  document.querySelectorAll(".gs-item[href]").forEach(a => {
    a.addEventListener("click", () => {
      document.querySelectorAll(".gs-item").forEach(x => x.classList.remove("active"));
      a.classList.add("active");
    });
  });

  document.getElementById("gsMoreBtn")?.addEventListener("click", () => {
    const m = document.getElementById("gsMoreMenu");
    if (m) m.hidden = !m.hidden;
  });

  window.addEventListener("orbye-login", renderHome);
  renderHome();
  // refresh home when returning to hash inicio
  window.addEventListener("hashchange", () => {
    if (location.hash === "#inicio" || location.hash === "") renderHome();
  });
})();

// SYNC_HAPPY
window.addEventListener("orbye-cloud-ready", async () => {
  if (!window.orbyeCloud?.enabled) return;
  setTimeout(async () => {
    try {
      const ok = await window.orbyeCloud.testSync?.();
      if (ok && typeof window.orbyeBrowserNotify === "function") {
        // soft, only once per day
        const k = "orbye_happy_sync_" + new Date().toDateString();
        if (!localStorage.getItem(k)) {
          localStorage.setItem(k, "1");
          window.orbyeBrowserNotify("OrbyE conectado", "Chat y posts pueden verse en otros dispositivos", "#inicio");
        }
      }
    } catch (_) {}
  }, 2000);
});
