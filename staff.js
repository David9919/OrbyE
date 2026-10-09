(() => {
  const STAFF_KEY = "orbye_staff_chat_v1";
  const MEMBERS_KEY = "orbye_staff_members_v1";
  const panel = document.getElementById("staffPanel");
  const openBtn = document.getElementById("staffOpenBtn");
  const closeBtn = document.getElementById("closeStaff");
  const joinBtn = document.getElementById("staffJoinBtn");
  const leaveBtn = document.getElementById("staffLeaveBtn");
  const listEl = document.getElementById("staffMessages");
  const input = document.getElementById("staffInput");
  const sendBtn = document.getElementById("staffSend");
  const statusEl = document.getElementById("staffStatus");
  const membersEl = document.getElementById("staffMembers");
  const imgInput = document.getElementById("staffImageInput");
  const imgPick = document.getElementById("staffImagePick");
  const imgName = document.getElementById("staffImageName");
  const imgPrev = document.getElementById("staffImagePreview");
  let pendingStaffImg = null;
  window.orbyeSetStaffGif = function(url, name) {
    pendingStaffImg = url;
    if (imgName) imgName.textContent = name || "gif.gif";
    if (imgPrev) {
      imgPrev.hidden = false;
      imgPrev.innerHTML = `<img src="${url}" alt="gif">`;
    }
  };

  function getUser() { return localStorage.getItem("orbye_demo_user"); }
  function isAdmin() { return localStorage.getItem("orbye_demo_role") === "admin"; }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function loadMembers() {
    try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) || "[]"); } catch { return []; }
  }
  function saveMembers(m) { localStorage.setItem(MEMBERS_KEY, JSON.stringify(m)); }

  function loadChat() {
    try { return JSON.parse(localStorage.getItem(STAFF_KEY) || "[]"); } catch { return []; }
  }
  function saveChat(list) { localStorage.setItem(STAFF_KEY, JSON.stringify(list)); }

  function isStaff(user) {
    if (!user) return false;
    if (isAdmin()) return true;
    return loadMembers().includes(user);
  }

  function allModerators() {
    const set = new Set();
    // Creator / admin accounts
    set.add("DavidAvila");
    try {
      const accounts = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
      Object.keys(accounts).forEach(k => {
        if (accounts[k] && accounts[k].role === "admin") set.add(k);
      });
    } catch {}
    // Staff volunteers
    loadMembers().forEach(u => set.add(u));
    // Space mods
    try {
      const spaces = JSON.parse(localStorage.getItem("orbye_spaces_v2") || "{}");
      Object.values(spaces).forEach(s => {
        if (s.owner) set.add(s.owner);
        (s.mods || []).forEach(m => set.add(m));
      });
    } catch {}
    return Array.from(set);
  }

  function notifyAllMods(text, href) {
    const mods = allModerators();
    if (typeof window.orbyeNotify === "function") {
      mods.forEach(m => {
        try { window.orbyeNotify(m, text, "staff", href || "#inicio"); } catch {}
      });
    } else {
      // fallback direct notifications storage
      try {
        const KEY = "orbye_notifications_v1";
        const all = JSON.parse(localStorage.getItem(KEY) || "{}");
        mods.forEach(m => {
          if (!all[m]) all[m] = [];
          all[m].unshift({
            id: crypto.randomUUID(),
            text,
            type: "staff",
            href: href || "#inicio",
            ts: Date.now(),
            read: false
          });
          if (all[m].length > 60) all[m].length = 60;
        });
        localStorage.setItem(KEY, JSON.stringify(all));
      } catch {}
    }
  }

  function renderMembers() {
    if (!membersEl) return;
    const mods = loadMembers().filter(m => m !== "DavidAvila");
    const names = ["DavidAvila (creador)", ...mods];
    membersEl.textContent = "Equipo: " + names.join(", ");
  }

  function canDeleteMsg(m) {
    const me = getUser();
    if (!me || !m) return false;
    return m.user === me || isAdmin();
  }

  function renderChat() {
    if (!listEl) return;
    const user = getUser();
    if (!isStaff(user)) {
      listEl.innerHTML = '<p class="muted">Únete al Staff Team (100% voluntario) para ver el chat y reportar bugs.</p>';
      return;
    }
    const list = loadChat();
    listEl.innerHTML = list.length
      ? list.map(m => {
          const del = canDeleteMsg(m)
            ? `<button type="button" class="staff-del" data-del-msg="${esc(m.id)}">Borrar</button>`
            : "";
          const modBadge = (typeof window.orbyeModBadgeHtml === "function") ? window.orbyeModBadgeHtml(m.user) : "";
          return `<div class="staff-msg" data-mid="${esc(m.id)}">
            <button type="button" class="staff-user user-hit" data-user="${esc(m.user)}">${esc(m.user)}</button>${modBadge}
            <span class="staff-msg-text">${linkify(m.text)}</span>
            ${m.image ? `<img class="staff-msg-img" src="${m.image}" alt="prueba">` : ""}
            <div class="staff-msg-foot">
              <small>${new Date(m.ts).toLocaleString("es-ES")}</small>
              ${del}
            </div>
          </div>`;
        }).join("")
      : '<p class="muted">Sin mensajes. Reporta bugs o ideas aquí.</p>';
    listEl.scrollTop = listEl.scrollHeight;
  }

  function renderDmcaQueue() {
    let box = document.getElementById("staffDmcaBox");
    if (!box) {
      const panel = document.getElementById("staffPanel");
      const inner = panel && panel.querySelector(".account-box");
      if (!inner) return;
      box = document.createElement("div");
      box.id = "staffDmcaBox";
      box.className = "staff-dmca-box";
      inner.appendChild(box);
    }
    if (!isAdmin() && getUser() !== "DavidAvila") {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    let list = [];
    try { list = JSON.parse(localStorage.getItem("orbye_dmca_notices_v1") || "[]"); } catch {}
    if (!list.length) {
      box.innerHTML = "<h4>Bandeja DMCA</h4><p class=\"muted\">Sin avisos todavía.</p>";
      return;
    }
    box.innerHTML = "<h4>Bandeja DMCA (" + list.length + ")</h4>" + list.slice(0, 15).map(n =>
      "<div class=\"dmca-item\" data-dmca-id=\"" + n.id + "\"><b>" + (n.name || "") + "</b> · " + new Date(n.ts).toLocaleString("es-ES") +
      " · <span class=\"dmca-status\">" + (n.status || "pending") + "</span>" +
      "<br><small>" + (n.url || "") + "</small><br><small>" + (n.desc || "").slice(0, 120) + "</small>" +
      (n.document && n.document.name ? "<br><small>Doc: " + n.document.name + "</small>" : "") +
      "<br><button type=\"button\" class=\"button outline dmca-resolve\" data-resolve=\"" + n.id + "\">Resuelto</button> " +
      "<button type=\"button\" class=\"button outline dmca-del\" data-dmca-del=\"" + n.id + "\">Borrar</button>" +
      "</div>"
    ).join("");
    box.onclick = (e) => {
      const del = e.target.closest("[data-dmca-del]");
      const res = e.target.closest("[data-resolve]");
      let list2 = [];
      try { list2 = JSON.parse(localStorage.getItem("orbye_dmca_notices_v1") || "[]"); } catch {}
      if (del) {
        list2 = list2.filter(x => x.id !== del.dataset.dmcaDel);
        localStorage.setItem("orbye_dmca_notices_v1", JSON.stringify(list2));
        renderDmcaQueue();
        return;
      }
      if (res) {
        list2 = list2.map(x => x.id === res.dataset.resolve ? { ...x, status: "resolved" } : x);
        localStorage.setItem("orbye_dmca_notices_v1", JSON.stringify(list2));
        renderDmcaQueue();
      }
    };
  }

  function refresh() {
    const user = getUser();
    const staff = isStaff(user);
    if (statusEl) {
      statusEl.textContent = !user
        ? "Inicia sesión para unirte."
        : staff
          ? "Eres parte del Staff Team (voluntario)."
          : "Aún no eres del staff. Es 100% voluntario.";
    }
    // Mostrar botones de forma fiable (hidden + display)
    if (joinBtn) {
      const showJoin = !!user && !staff;
      joinBtn.hidden = !showJoin;
      joinBtn.style.display = showJoin ? "inline-flex" : "none";
    }
    if (leaveBtn) {
      // Admin/creador también puede "salir" de la vista voluntaria salvo que queramos bloquear
      const showLeave = !!user && staff && user !== "DavidAvila";
      leaveBtn.hidden = !showLeave;
      leaveBtn.style.display = showLeave ? "inline-flex" : "none";
    }
    if (input) input.disabled = !staff;
    if (sendBtn) sendBtn.disabled = !staff;
    if (imgPick) imgPick.disabled = !staff;
    renderMembers();
    renderChat();
    renderDmcaQueue();
  }

  openBtn?.addEventListener("click", e => {
    e.preventDefault();
    if (panel) panel.hidden = false;
    refresh();
  });
  closeBtn?.addEventListener("click", () => { if (panel) panel.hidden = true; });
  panel?.addEventListener("click", e => { if (e.target === panel) panel.hidden = true; });

  joinBtn?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const user = getUser();
    if (!user) {
      const ap = document.getElementById("accountPanel");
      if (ap) { ap.hidden = false; ap.style.display = "flex"; }
      return;
    }
    const m = loadMembers();
    if (!m.includes(user)) {
      m.push(user);
      saveMembers(m);
    }
    notifyAllMods(user + " se unió al Staff Team (voluntario)", "#inicio");
    if (statusEl) statusEl.textContent = "Te uniste al Staff Team.";
    refresh();
  });

  imgPick?.addEventListener("click", () => imgInput?.click());
  document.getElementById("staffOrbyDrop")?.addEventListener("click", e => {
    if (e.target.closest(".orbypload-play") || e.target.id === "staffOrbyDrop") imgInput?.click();
  });
  imgInput?.addEventListener("change", () => {
    const f = imgInput.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    if (f.size > 2 * 1024 * 1024) {
      if (statusEl) statusEl.textContent = "Imagen máx. 2 MB";
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      pendingStaffImg = r.result;
      if (imgName) imgName.textContent = f.name;
      if (imgPrev) {
        imgPrev.hidden = false;
        imgPrev.innerHTML = `<img src="${pendingStaffImg}" alt="">`;
      }
    };
    r.readAsDataURL(f);
  });

  leaveBtn?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const user = getUser();
    if (!user) return;
    if (user === "DavidAvila") {
      if (statusEl) statusEl.textContent = "El creador siempre forma parte del staff.";
      return;
    }
    saveMembers(loadMembers().filter(x => x !== user));
    if (statusEl) statusEl.textContent = "Saliste del Staff Team.";
    refresh();
  });

  listEl?.addEventListener("click", e => {
    const del = e.target.closest("[data-del-msg]");
    if (del) {
      const id = del.dataset.delMsg;
      const me = getUser();
      let list = loadChat();
      const msg = list.find(m => m.id === id);
      if (!msg || !canDeleteMsg(msg)) return;
      list = list.filter(m => m.id !== id);
      saveChat(list);
      renderChat();
      return;
    }
    const hit = e.target.closest(".user-hit");
    if (hit) {
      const u = hit.dataset.user;
      if (u && typeof window.orbyeOpenProfile === "function") {
        window.orbyeOpenProfile(u);
      } else if (u && typeof window.openPublicProfile === "function") {
        window.openPublicProfile(u);
      }
    }
  });

  sendBtn?.addEventListener("click", () => {
    const user = getUser();
    if (!isStaff(user)) return;
    const text = (input?.value || "").trim();
    if (!text) return;
    const list = loadChat();
    list.push({ id: crypto.randomUUID(), user, text, image: pendingStaffImg || null, ts: Date.now() });
    pendingStaffImg = null;
    if (imgInput) imgInput.value = "";
    if (imgName) imgName.textContent = "Imagen opcional";
    if (imgPrev) { imgPrev.hidden = true; imgPrev.innerHTML = ""; }
    if (list.length > 200) list.splice(0, list.length - 200);
    saveChat(list);
    if (input) input.value = "";
    renderChat();

    // Bug / report → notify all moderators including creator
    const lower = text.toLowerCase();
    const isReport = /bug|error|fallo|report|problema|issue|roto|no funciona|arreglar/.test(lower);
    if (isReport) {
      notifyAllMods("🛡 Staff: " + user + " reportó → " + text.slice(0, 120), "#inicio");
    } else {
      // still notify creator of new staff messages lightly
      notifyAllMods("🛡 Staff: mensaje de " + user, "#inicio");
    }
  });
  input?.addEventListener("keydown", e => {
    if (e.key === "Enter") sendBtn?.click();
  });

  window.addEventListener("orbye-login", refresh);
  refresh();
})();

document.addEventListener("click", e => {
  const a = e.target.closest("a.orbye-deeplink, a[href*='#orbytube']");
  if (!a) return;
  const href = a.getAttribute("href") || a.getAttribute("data-hash") || "";
  const m = href.match(/[?&]v=([^&]+)/) || href.match(/#orbytube\?v=([^&]+)/);
  if (m && m[1]) {
    e.preventDefault();
    if (typeof window.orbyeOpenVideo === "function") window.orbyeOpenVideo(decodeURIComponent(m[1]));
    else location.hash = "#orbytube?v=" + encodeURIComponent(m[1]);
  }
});
