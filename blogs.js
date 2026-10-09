(() => {
  const LIKE_KEY = "orbye_blog_likes_v1";
  const CMT_KEY = "orbye_blog_comments_v1";
  function getUser() { return localStorage.getItem("orbye_demo_user"); }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[c]));
  }
  function refreshLikes() {
    const likes = load(LIKE_KEY);
    document.querySelectorAll("[data-blog-like]").forEach(btn => {
      const id = btn.getAttribute("data-blog-like");
      const n = (likes[id] || []).length;
      const sp = btn.querySelector("span");
      if (sp) sp.textContent = String(n);
      const me = getUser();
      btn.classList.toggle("on", !!(me && (likes[id] || []).includes(me)));
    });
  }
  function renderComments(id) {
    const box = document.querySelector("#blog-cmt-" + id + " .blog-cmt-list");
    if (!box) return;
    const all = load(CMT_KEY);
    const list = all[id] || [];
    box.innerHTML = list.length ? list.map(c => {
      const av = typeof window.orbyeAvatarHtml === "function" ? window.orbyeAvatarHtml(c.user, "tiny") : "";
      return `<div class="blog-cmt-row">${av}<b class="user-hit" data-user="${esc(c.user)}">${esc(c.user)}</b> <span>${esc(c.text)}</span></div>`;
    }).join("") : '<p class="muted">Sé el primero en comentar.</p>';
  }
  document.addEventListener("click", e => {
    const like = e.target.closest("[data-blog-like]");
    if (like) {
      const me = getUser();
      if (!me) { document.getElementById("accountPanel").hidden = false; return; }
      const id = like.getAttribute("data-blog-like");
      const likes = load(LIKE_KEY);
      likes[id] = likes[id] || [];
      if (likes[id].includes(me)) likes[id] = likes[id].filter(u => u !== me);
      else likes[id].push(me);
      save(LIKE_KEY, likes);
      refreshLikes();
      return;
    }
    const tog = e.target.closest("[data-blog-cmt]");
    if (tog) {
      const id = tog.getAttribute("data-blog-cmt");
      const panel = document.getElementById("blog-cmt-" + id);
      if (panel) {
        panel.hidden = !panel.hidden;
        if (!panel.hidden) renderComments(id);
      }
      return;
    }
    const send = e.target.closest("[data-blog-send]");
    if (send) {
      const me = getUser();
      if (!me) { document.getElementById("accountPanel").hidden = false; return; }
      const id = send.getAttribute("data-blog-send");
      const input = document.querySelector('[data-blog-input="' + id + '"]');
      const text = (input && input.value || "").trim();
      if (!text) return;
      const all = load(CMT_KEY);
      all[id] = all[id] || [];
      all[id].push({ user: me, text, ts: Date.now() });
      save(CMT_KEY, all);
      if (input) input.value = "";
      renderComments(id);
    }
  });
  // show section on hash
  function syncHash() {
    const sec = document.getElementById("guiasEmprende");
    if (!sec) return;
    if (location.hash === "#guiasEmprende") {
      document.querySelectorAll("#appShell .section, #appShell section").forEach(s => {
        if (s.id && s.id !== "guiasEmprende") s.hidden = true;
      });
      sec.hidden = false;
      refreshLikes();
    }
  }
  window.addEventListener("hashchange", syncHash);
  document.addEventListener("DOMContentLoaded", () => { refreshLikes(); syncHash(); });
  refreshLikes();
})();
