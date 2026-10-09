(() => {
  const KEY = "orbye_groups_v1";
  const MSG = "orbye_group_msgs_v1";
  function getUser() { return localStorage.getItem("orbye_demo_user"); }
  function isAdmin() {
    const u = (getUser() || "").toLowerCase();
    return u === "davidavila" || localStorage.getItem("orbye_demo_email") === "avilarodriguezdavid13@gmail.com";
  }
  function loadG() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
  function saveG(a) { localStorage.setItem(KEY, JSON.stringify(a)); }
  function loadM() { try { return JSON.parse(localStorage.getItem(MSG) || "{}"); } catch { return {}; } }
  function saveM(o) { localStorage.setItem(MSG, JSON.stringify(o)); }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[c]));
  }
  let current = null;
  let pending = null;

  function canEditGroup(g) {
    const me = getUser();
    if (!g || !me) return false;
    return g.owner === me || isAdmin();
  }

  function renderList() {
    const el = document.getElementById("groupList");
    if (!el) return;
    const groups = loadG();
    const me = getUser();
    el.innerHTML = groups.length ? groups.map(g => {
      const lock = g.isPrivate ? "🔒 " : "";
      return `<button type="button" class="button outline" data-open-group="${g.id}" style="margin:4px">${lock}${esc(g.name)}</button>`;
    }).join("") : '<p class="muted">Crea un grupo para chatear en el centro.</p>';
  }

  function renderRoom() {
    const list = document.getElementById("groupChatList");
    if (!list || !current) return;
    const all = loadM();
    const msgs = all[current] || [];
    const g = loadG().find(x => x.id === current);
    const head = document.getElementById("groupRoomHead");
    if (head && g) {
      const logo = g.logo ? `<img src="${g.logo}" class="group-logo" alt="">` : `<span class="group-logo-ph">G</span>`;
      head.innerHTML = `
        <div class="group-banner" style="${g.banner ? "background-image:url("+g.banner+")" : ""}"></div>
        <div class="group-head-row">${logo}<div><h4 id="groupRoomTitle">${esc(g.name)}</h4>
        <small class="muted">${g.isPrivate ? "Privado" : "Público"}${g.joinCode ? " · código activo" : ""}</small></div>
        ${canEditGroup(g) ? `<button type="button" class="button outline" id="groupEditOpen">Editar grupo</button>` : ""}
        </div>`;
      document.getElementById("groupEditOpen")?.addEventListener("click", () => openEdit(g));
    }
    list.innerHTML = msgs.length ? msgs.map(m => {
      const av = typeof window.orbyeAvatarHtml === "function" ? window.orbyeAvatarHtml(m.user, "sm") : "";
      let media = "";
      if (m.media) {
        if (m.media.type === "image" || m.media.type === "gif") media = `<img class="gchat-media" src="${m.media.url}" alt="">`;
        else if (m.media.type === "video") media = `<video class="gchat-media" controls src="${m.media.url}"></video>`;
        else if (m.media.type === "model") media = `<button type="button" class="button outline" data-view-model="${m.media.url}">Ver 3D</button>`;
      }
      const me = getUser();
      const canDel = me && (m.user === me || isAdmin() || (g && g.owner === me));
      return `<div class="gchat-msg">
        ${av}<div class="gchat-body">
          <b class="user-hit" data-user="${esc(m.user)}">${esc(m.user)}</b>
          ${canDel ? `<button type="button" class="gchat-del" data-del-gmsg="${m.ts}">Eliminar</button>` : ""}
          <span class="gchat-text">${esc(m.text||"")}</span>${media}
          <small>${new Date(m.ts).toLocaleString()}</small>
        </div></div>`;
    }).join("") : '<p class="muted">Sin mensajes. Comparte fotos, videos, GIFs o modelos 3D.</p>';
    list.scrollTop = list.scrollHeight;
  }

  function openEdit(g) {
    const box = document.getElementById("groupEditBox");
    if (!box) return;
    box.hidden = false;
    document.getElementById("groupEditName").value = g.name || "";
    document.getElementById("groupEditPrivate").checked = !!g.isPrivate;
    document.getElementById("groupEditCode").value = g.joinCode || "";
    box.dataset.gid = g.id;
  }

  document.getElementById("openGroupChatBtn")?.addEventListener("click", () => {
    const p = document.getElementById("groupChatPanel");
    if (p) { p.hidden = false; p.style.display = "flex"; p.classList.add("chat-stage-open"); }
    renderList();
  });
  document.getElementById("closeGroupChat")?.addEventListener("click", () => {
    const p = document.getElementById("groupChatPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
  });
  document.getElementById("groupFullscreenBtn")?.addEventListener("click", () => {
    const p = document.getElementById("groupChatPanel");
    if (p) p.classList.toggle("chat-fullscreen");
  });

  document.getElementById("groupCreateBtn")?.addEventListener("click", () => {
    const me = getUser();
    if (!me) { document.getElementById("accountPanel").hidden = false; return; }
    const name = (document.getElementById("groupNameInput")?.value || "").trim();
    if (!name) return;
    const isPrivate = !!document.getElementById("groupCreatePrivate")?.checked;
    let joinCode = (document.getElementById("groupCreateCode")?.value || "").trim();
    if (isPrivate && !joinCode) joinCode = Math.random().toString(36).slice(2, 8);
    const groups = loadG();
    groups.unshift({
      id: String(Date.now()),
      name, owner: me, ts: Date.now(),
      isPrivate, joinCode: joinCode || null,
      logo: null, banner: null
    });
    saveG(groups.slice(0, 40));
    document.getElementById("groupNameInput").value = "";
    renderList();
  });

  document.addEventListener("click", e => {
    const open = e.target.closest("[data-open-group]");
    if (open) {
      const id = open.getAttribute("data-open-group");
      const g = loadG().find(x => x.id === id);
      if (!g) return;
      const me = getUser();
      if (g.isPrivate && g.owner !== me && !isAdmin()) {
        const code = prompt("Grupo privado. Introduce el código:");
        if (code !== g.joinCode) { alert("Código incorrecto"); return; }
      }
      current = id;
      const room = document.getElementById("groupRoom");
      if (room) room.hidden = false;
      renderRoom();
    }
    const del = e.target.closest("[data-del-gmsg]");
    if (del && current) {
      const ts = del.getAttribute("data-del-gmsg");
      const all = loadM();
      all[current] = (all[current] || []).filter(m => String(m.ts) !== String(ts));
      saveM(all);
      renderRoom();
    }
  });

  // GIF in groups
  document.getElementById("groupChatGif")?.addEventListener("click", () => {
    if (typeof window.orbyeOpenGifPicker === "function") {
      window.orbyeOpenGifPicker((url) => {
        pending = { type: "gif", url };
        const prev = document.getElementById("groupChatPrev");
        if (prev) { prev.hidden = false; prev.innerHTML = `<img src="${url}" style="max-height:80px">`; }
      });
    }
  });
  document.getElementById("groupChatPick")?.addEventListener("click", () => document.getElementById("groupChatFile")?.click());
  document.getElementById("groupChatFile")?.addEventListener("change", () => {
    const f = document.getElementById("groupChatFile")?.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let type = "image";
      if (f.type.startsWith("video/")) type = "video";
      else if (/\.gif$/i.test(f.name) || f.type === "image/gif") type = "gif";
      else if (/\.glb$/i.test(f.name) || /\.gltf$/i.test(f.name)) type = "model";
      pending = { type, url: r.result };
      const prev = document.getElementById("groupChatPrev");
      if (prev) {
        prev.hidden = false;
        prev.innerHTML = type === "video"
          ? `<video src="${r.result}" style="max-height:80px" muted></video>`
          : `<img src="${r.result}" style="max-height:80px">`;
      }
    };
    r.readAsDataURL(f);
  });
  document.getElementById("groupChatSend")?.addEventListener("click", () => {
    const me = getUser();
    if (!me || !current) return;
    const text = (document.getElementById("groupChatInput")?.value || "").trim();
    if (!text && !pending) return;
    const all = loadM();
    all[current] = all[current] || [];
    all[current].push({ user: me, text, media: pending, ts: Date.now() });
    saveM(all);
    pending = null;
    const input = document.getElementById("groupChatInput");
    if (input) input.value = "";
    const file = document.getElementById("groupChatFile");
    if (file) file.value = "";
    const prev = document.getElementById("groupChatPrev");
    if (prev) { prev.hidden = true; prev.innerHTML = ""; }
    renderRoom();
  });

  // Save group edit
  function bindGroupOrby(zoneId, inputId, nameId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const nameEl = document.getElementById(nameId);
    if (!zone || !input) return;
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      if (nameEl && input.files?.[0]) nameEl.textContent = input.files[0].name;
    });
  }
  bindGroupOrby("groupLogoZone", "groupEditLogo", "groupLogoName");
  bindGroupOrby("groupBannerZone", "groupEditBanner", "groupBannerName");

  document.getElementById("groupEditSave")?.addEventListener("click", async () => {
    const box = document.getElementById("groupEditBox");
    const id = box?.dataset.gid;
    if (!id) return;
    const groups = loadG();
    const g = groups.find(x => x.id === id);
    if (!g || !canEditGroup(g)) return;
    g.name = (document.getElementById("groupEditName")?.value || g.name).trim();
    g.isPrivate = !!document.getElementById("groupEditPrivate")?.checked;
    g.joinCode = (document.getElementById("groupEditCode")?.value || "").trim() || null;
    const logoF = document.getElementById("groupEditLogo")?.files?.[0];
    const banF = document.getElementById("groupEditBanner")?.files?.[0];
    const read = (f) => new Promise(res => {
      if (!f) return res(null);
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    });
    if (logoF) g.logo = await read(logoF);
    if (banF) g.banner = await read(banF);
    saveG(groups);
    box.hidden = true;
    renderList();
    renderRoom();
  });
})();
