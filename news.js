(() => {
  const KEY = "orbye_news_v1";
  const feed = document.getElementById("newsFeed");
  const openBtn = document.getElementById("newsOpenComposer");
  const composer = document.getElementById("newsComposer");
  const titleEl = document.getElementById("newsTitle");
  const bodyEl = document.getElementById("newsBody");
  const pubBtn = document.getElementById("newsPublish");
  let editingId = null;

  function getUser() { return localStorage.getItem("orbye_demo_user"); }
  function isAdmin() { return localStorage.getItem("orbye_demo_role") === "admin"; }
  function isMod() {
    if (isAdmin()) return true;
    const user = getUser();
    if (!user) return false;
    try {
      const spaces = JSON.parse(localStorage.getItem("orbye_spaces_v2") || "{}");
      return Object.values(spaces).some(s => s.owner === user || (s.mods || []).includes(user));
    } catch { return false; }
  }
  function canManage(n) {
    const user = getUser();
    if (!user || !n) return false;
    return n.user === user || isAdmin() || isMod();
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function render() {
    if (!feed) return;
    const list = load();
    if (!list.length) {
      feed.innerHTML = '<p class="muted">Aún no hay noticias. Sé el primero en publicar.</p>';
      return;
    }
    feed.innerHTML = list.map(n => {
      const manage = canManage(n);
      return `<article class="news-card" data-nid="${esc(n.id)}">
        <h3>${esc(n.title)}</h3>
        <p>${esc(n.body)}</p>
        <small>${esc(n.user)} · ${new Date(n.ts).toLocaleString("es-ES")}</small>
        ${manage ? `<div class="news-actions">
          <button type="button" class="button outline news-edit" data-edit="${esc(n.id)}">Editar</button>
          <button type="button" class="button outline news-del" data-del="${esc(n.id)}">Borrar</button>
        </div>` : ""}
      </article>`;
    }).join("");
  }

  openBtn?.addEventListener("click", () => {
    if (!getUser()) {
      document.getElementById("accountPanel").hidden = false;
      return;
    }
    editingId = null;
    if (titleEl) titleEl.value = "";
    if (bodyEl) bodyEl.value = "";
    if (pubBtn) pubBtn.textContent = "Publicar noticia";
    if (composer) composer.hidden = !composer.hidden;
  });

  pubBtn?.addEventListener("click", () => {
    const user = getUser();
    if (!user) return;
    const title = (titleEl?.value || "").trim();
    const body = (bodyEl?.value || "").trim();
    if (!title || !body) return;
    const list = load();
    if (editingId) {
      const i = list.findIndex(n => n.id === editingId);
      if (i >= 0 && canManage(list[i])) {
        list[i].title = title;
        list[i].body = body;
        list[i].edited = Date.now();
      }
      editingId = null;
      if (pubBtn) pubBtn.textContent = "Publicar noticia";
    } else {
      list.unshift({ id: crypto.randomUUID(), title, body, user, ts: Date.now() });
      if (list.length > 40) list.length = 40;
    }
    save(list);
    if (titleEl) titleEl.value = "";
    if (bodyEl) bodyEl.value = "";
    if (composer) composer.hidden = true;
    render();
  });

  feed?.addEventListener("click", e => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (edit) {
      const id = edit.dataset.edit;
      const n = load().find(x => x.id === id);
      if (!n || !canManage(n)) return;
      editingId = id;
      if (titleEl) titleEl.value = n.title;
      if (bodyEl) bodyEl.value = n.body;
      if (pubBtn) pubBtn.textContent = "Guardar cambios";
      if (composer) composer.hidden = false;
      composer?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (del) {
      const id = del.dataset.del;
      const list = load();
      const n = list.find(x => x.id === id);
      if (!n || !canManage(n)) return;
      if (!confirm("¿Borrar esta noticia?")) return;
      save(list.filter(x => x.id !== id));
      render();
    }
  });

  render();
  window.addEventListener("orbye-login", render);
})();
