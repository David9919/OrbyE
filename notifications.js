(() => {
  const KEY = "orbye_notifications_v1";
  const btn = document.getElementById("notifBtn");
  const countEl = document.getElementById("notifCount");
  const panel = document.getElementById("notifPanel");
  const listEl = document.getElementById("notifList");
  const markBtn = document.getElementById("notifMarkRead");

  function getUser() {
    return localStorage.getItem("orbye_demo_user") || null;
  }

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }

  function saveAll(obj) {
    localStorage.setItem(KEY, JSON.stringify(obj));
  }

  function getForUser(user) {
    const all = loadAll();
    if (!all[user]) all[user] = [];
    return all[user];
  }

  function pushNotif(toUser, item) {
    if (!toUser) return;
    const all = loadAll();
    if (!all[toUser]) all[toUser] = [];
    all[toUser].unshift({
      id: crypto.randomUUID(),
      text: item.text,
      type: item.type || "info",
      href: item.href || "",
      ts: Date.now(),
      read: false
    });
    if (all[toUser].length > 60) all[toUser].length = 60;
    saveAll(all);
    if (getUser() === toUser) refreshBadge();
  }

  function unreadCount(user) {
    return getForUser(user).filter(n => !n.read).length;
  }

  function refreshBadge() {
    const user = getUser();
    if (!btn) return;
    if (!user) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    const n = unreadCount(user);
    if (countEl) {
      if (n > 0) {
        countEl.hidden = false;
        countEl.textContent = n > 99 ? "99+" : String(n);
      } else {
        countEl.hidden = true;
      }
    }
  }

  function renderList() {
    const user = getUser();
    if (!listEl) return;
    if (!user) {
      listEl.innerHTML = '<p class="muted">Inicia sesión para ver notificaciones.</p>';
      return;
    }
    const list = getForUser(user);
    if (!list.length) {
      listEl.innerHTML = '<p class="muted">Sin notificaciones todavía.</p>';
      return;
    }
    listEl.innerHTML = list.map(n => {
      const ago = new Date(n.ts).toLocaleString("es-ES");
      const cls = (n.read ? "notif-item" : "notif-item unread") + (n.type === "mod" || n.anonymousMod ? " notif-mod" : "");
      const href = n.href ? `data-href="${String(n.href).replace(/"/g, "")}"` : "";
      const label = (n.type === "mod" || n.anonymousMod)
        ? n.text.replace(/^Mensaje de los moderadores:\s*/i, "")
        : n.text;
      const title = (n.type === "mod" || n.anonymousMod) ? "Mensaje de los moderadores" : "";
      return `<div class="${cls}" data-id="${n.id}" ${href}>
        ${title ? `<strong class="mod-label">${title}</strong>` : ""}
        <span class="notif-text">${label}</span>
        <small>${ago}</small>
        <div class="notif-actions">
          <button type="button" class="notif-open" data-open="${n.id}">Abrir</button>
          <button type="button" class="notif-del" data-del="${n.id}">Borrar</button>
        </div>
      </div>`;
    }).join("");
  }

  btn?.addEventListener("click", e => {
    e.stopPropagation();
    if (!getUser()) {
      const ap = document.getElementById("accountPanel");
      if (ap) ap.hidden = false;
      return;
    }
    if (panel) {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderList();
    }
  });

  markBtn?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const user = getUser();
    if (!user) return;
    const all = loadAll();
    if (!all[user]) all[user] = [];
    all[user].forEach(n => { n.read = true; });
    saveAll(all);
    refreshBadge();
    renderList();
  });

  listEl?.addEventListener("click", e => {
    e.stopPropagation();
    const user = getUser();
    if (!user) return;

    const del = e.target.closest("[data-del]");
    if (del) {
      const id = del.dataset.del;
      const all = loadAll();
      all[user] = (all[user] || []).filter(n => n.id !== id);
      saveAll(all);
      refreshBadge();
      renderList();
      return;
    }

    const open = e.target.closest("[data-open]");
    const item = e.target.closest(".notif-item");
    if (open || item) {
      const id = open?.dataset.open || item?.dataset.id;
      const all = loadAll();
      const n = (all[user] || []).find(x => x.id === id);
      if (n) {
        n.read = true;
        saveAll(all);
        refreshBadge();
      }
      const href = item?.getAttribute("data-href") || (n && n.href) || "";
      if (href) {
        if (href.startsWith("http")) {
          // same origin video links preferred
          try {
            const u = new URL(href);
            if (u.origin === location.origin) {
              location.hash = u.hash || "#orbytube";
              if (u.searchParams.get("v") && typeof window.orbyeOpenVideo === "function") {
                window.orbyeOpenVideo(u.searchParams.get("v"));
              }
            } else {
              location.hash = u.hash || href;
            }
          } catch {
            location.hash = href.startsWith("#") ? href : "#orbytube";
          }
        } else {
          location.hash = href.startsWith("#") ? href : "#" + href;
          // #orbytube?v=id or #orbytube&v=id
          const m = String(href).match(/[?&]v=([a-zA-Z0-9_-]+)/);
          if (m && typeof window.orbyeOpenVideo === "function") {
            window.orbyeOpenVideo(m[1]);
          }
        }
      }
      if (panel) panel.hidden = true;
      renderList();
    }
  });

  document.addEventListener("click", e => {
    if (panel && !panel.hidden && !e.target.closest("#notifPanel") && !e.target.closest("#notifBtn")) {
      panel.hidden = true;
    }
  });

  window.addEventListener("orbye-login", () => {
    refreshBadge();
  });

  window.orbyeNotify = function (toUser, text, type, href) {
    if (!toUser) return;
    const me = getUser();
    if (me && toUser === me && type !== "dmca" && type !== "staff") return;
    pushNotif(toUser, { text, type, href });
    if (getUser() === toUser) refreshBadge();
  };

  refreshBadge();
})();
