(() => {
  
  const STORAGE_KEY = "orbye_void_drakes_chat_v1";
  const USER_KEY = "orbye_demo_user";
  const ROLE_KEY = "orbye_demo_role";

  const messagesEl = document.getElementById("chatMessages");
  const inputEl = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const loginNote = document.getElementById("chatLoginNote");
  const chatForm = document.getElementById("chatForm");
  const emojiBtn = document.getElementById("emojiBtn");
  const emojiPicker = document.getElementById("emojiPicker");
  const gifBtn = document.getElementById("gifBtn");
  const videoBtn = document.getElementById("videoBtn");
  const mediaInput = document.getElementById("chatMediaInput");
  const onlineCount = document.getElementById("onlineCount");
  const toastEl = document.getElementById("orbyeToast");
  const accountPanel = document.getElementById("accountPanel");

  const EMOJIS = ["🐉","🔥","✨","💜","🖤","⚡","🌌","👾","🎮","🎬","💬","❤️","👍","😂","🚀","🌙","⭐","💎","🛡️","👑","🎉","😎","🤝","💪","👻","🖤","🗡️","🦇","🩸"];

  function getUser() {
    return localStorage.getItem(USER_KEY) || null;
  }

  function setUser(name) {
    localStorage.setItem(USER_KEY, name);
  }

  function isModerator() {
    return localStorage.getItem(ROLE_KEY) === "moderator";
  }

  function showToast(message, type = "info") {
    let el = document.getElementById("orbyeToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "orbyeToast";
      el.className = "orbye-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = "orbye-toast show " + type;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.classList.remove("show");
    }, 3200);
  }

  function openLogin() {
    if (accountPanel) {
      accountPanel.hidden = false;
      const email = document.getElementById("accountEmail");
      if (email) email.focus();
    }
    showToast("Primero inicia sesión dentro de OrbyE para participar en The Void Drakes.", "warn");
  }

  function requireLogin() {
    const user = getUser();
    if (user) return user;
    openLogin();
    return null;
  }

  function loadMessages() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveMessages(msgs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
      return true;
    } catch {
      showToast("No se pudo guardar. El archivo es demasiado grande para el almacenamiento local.", "error");
      return false;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }

  function renderMessages() {
    const msgs = loadMessages();
    if (!messagesEl) return;

    if (!msgs.length) {
      messagesEl.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">🐉</div>
          <p>Bienvenido al chat de <b>The Void Drakes</b></p>
          <p class="muted">Sé el primero en escribir. Soporta texto, emojis, GIFs y videos.</p>
        </div>`;
      return;
    }

    messagesEl.innerHTML = msgs.map(m => {
      const isMe = getUser() && m.user === getUser();
      let body = "";

      if (m.type === "text") {
        body = `<p class="chat-text">${esc(m.text)}</p>`;
      } else if (m.type === "emoji") {
        body = `<p class="chat-emoji-big">${m.text}</p>`;
      } else if (m.type === "gif" || m.type === "image") {
        body = `<img class="chat-media chat-gif" src="${m.url}" alt="GIF" loading="lazy">`;
      } else if (m.type === "video") {
        body = `<video class="chat-media" controls playsinline preload="metadata" src="${m.url}"></video>`;
      }

      const canDelete = isMe || isModerator();
      return `
        <div class="chat-msg ${isMe ? "me" : ""}" data-id="${m.id}">
          <div class="chat-msg-meta">
            <b>${esc(m.user)}</b>
            <span>${formatTime(m.ts)}</span>
            ${canDelete ? `<button class="chat-del" data-del="${m.id}" title="Eliminar">×</button>` : ""}
          </div>
          ${body}
        </div>`;
    }).join("");

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(msg) {
    const msgs = loadMessages();
    msgs.push(msg);
    if (msgs.length > 120) msgs.splice(0, msgs.length - 120);
    if (saveMessages(msgs)) renderMessages();
  }

  function updateUI() {
    const user = getUser();
    if (loginNote) {
      if (user) {
        loginNote.innerHTML = `Conectado como <b>${esc(user)}</b> · <button type="button" id="logoutChat" class="link-btn">Salir</button>`;
      } else {
        loginNote.innerHTML = `Inicia sesión para escribir, enviar GIFs o videos. <button type="button" id="openLoginFromChat" class="link-btn">Iniciar sesión</button>`;
      }
    }
    if (onlineCount) {
      onlineCount.textContent = user ? "● En línea" : "● Offline";
      onlineCount.style.color = user ? "#6dce8a" : "#80a8d2";
    }
    // disable inputs visually when not logged
    if (inputEl) inputEl.disabled = !user;
    if (sendBtn) sendBtn.disabled = !user;
    [emojiBtn, gifBtn, videoBtn].forEach(b => {
      if (b) b.disabled = !user;
    });
  }

  function sendText() {
    const user = requireLogin();
    if (!user || !inputEl) return;

    const text = inputEl.value.trim();
    if (!text) return;

    addMessage({
      id: crypto.randomUUID(),
      user,
      type: "text",
      text,
      ts: Date.now()
    });
    inputEl.value = "";
    inputEl.focus();
  }

  function insertEmoji(emoji) {
    const user = requireLogin();
    if (!user || !inputEl) return;
    const start = inputEl.selectionStart || inputEl.value.length;
    const end = inputEl.selectionEnd || inputEl.value.length;
    const val = inputEl.value;
    inputEl.value = val.slice(0, start) + emoji + val.slice(end);
    inputEl.focus();
    inputEl.setSelectionRange(start + emoji.length, start + emoji.length);
    if (emojiPicker) emojiPicker.hidden = true;
  }

  function handleMedia(file) {
    const user = requireLogin();
    if (!user || !file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      showToast("Solo se permiten imágenes, GIFs o videos.", "error");
      return;
    }

    // GIFs and images up to 6MB, videos up to 8MB (localStorage limit awareness)
    const maxSize = isVideo ? 8 * 1024 * 1024 : 6 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("Archivo demasiado grande. Máx. ~6 MB (GIF/imagen) o ~8 MB (video).", "error");
      return;
    }

    showToast("Subiendo...", "info");
    const reader = new FileReader();
    reader.onload = () => {
      const type = isVideo ? "video" : (file.type === "image/gif" || file.type === "image/webp" || /\.(gif|webp)$/i.test(file.name || "") ? "gif" : "image");
      addMessage({
        id: crypto.randomUUID(),
        user,
        type,
        url: reader.result,
        name: file.name,
        ts: Date.now()
      });
      showToast(type === "gif" ? "GIF enviado 🐉" : type === "video" ? "Video enviado" : "Imagen enviada", "ok");
    };
    reader.onerror = () => showToast("Error al leer el archivo.", "error");
    reader.readAsDataURL(file);
  }

  // Events
  sendBtn?.addEventListener("click", sendText);
  inputEl?.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  });

  // Click on disabled area also asks login
  inputEl?.addEventListener("focus", () => {
    if (!getUser()) {
      inputEl.blur();
      requireLogin();
    }
  });

  emojiBtn?.addEventListener("click", () => {
    if (!requireLogin()) return;
    if (!emojiPicker) return;
    emojiPicker.hidden = !emojiPicker.hidden;
    if (!emojiPicker.hidden) {
      emojiPicker.innerHTML = EMOJIS.map(e =>
        `<button type="button" class="emoji-item" data-emoji="${e}">${e}</button>`
      ).join("");
    }
  });

  emojiPicker?.addEventListener("click", e => {
    const btn = e.target.closest("[data-emoji]");
    if (btn) insertEmoji(btn.dataset.emoji);
  });

  // GIF button opens Giphy mini menu (gif-picker.js) via #gifBtn
  gifBtn?.addEventListener("click", () => {
    if (!requireLogin()) return;
    // picker handles open; fallback file if no picker
    if (typeof window.orbyeOpenGifPicker !== "function") {
      mediaInput.accept = "image/gif,image/*,.gif";
      mediaInput.click();
    }
  });

  videoBtn?.addEventListener("click", () => {
    if (!requireLogin()) return;
    mediaInput.accept = "video/*";
    mediaInput.click();
  });

  mediaInput?.addEventListener("change", () => {
    const file = mediaInput.files?.[0];
    if (file) handleMedia(file);
    mediaInput.value = "";
  });

  messagesEl?.addEventListener("click", e => {
    const del = e.target.closest("[data-del]");
    if (!del) return;
    const id = del.dataset.del;
    let msgs = loadMessages();
    const msg = msgs.find(m => m.id === id);
    if (!msg) return;
    if (msg.user !== getUser() && !isModerator()) {
      showToast("Solo puedes eliminar tus propios mensajes.", "error");
      return;
    }
    msgs = msgs.filter(m => m.id !== id);
    saveMessages(msgs);
    renderMessages();
  });

  document.addEventListener("click", e => {
    if (emojiPicker && !emojiPicker.hidden &&
        !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
      emojiPicker.hidden = true;
    }
    if (e.target.id === "logoutChat") {
      localStorage.removeItem(USER_KEY);
      updateUI();
      renderMessages();
      showToast("Sesión cerrada.", "info");
    }
    if (e.target.id === "openLoginFromChat") {
      openLogin();
    }
  });

  // Listen for successful login from account panel
  window.addEventListener("orbye-login", () => {
    updateUI();
    renderMessages();
    showToast("Sesión iniciada. Ya puedes usar el chat.", "ok");
  });

  // seed welcome once
  if (!loadMessages().length) {
    saveMessages([{
      id: "welcome",
      user: "The Void Drakes",
      type: "text",
      text: "¡Bienvenidos al reino 🐉! Where Dragons Rule the Realm. Chateen, envíen GIFs, emojis y videos.",
      ts: Date.now()
    }]);
  }

  updateUI();
  renderMessages();

  window.orbyeSetChatGif = function(url, name) {
    const user = getUser();
    if (!user) {
      requireLogin();
      return;
    }
    addMessage({
      id: crypto.randomUUID(),
      user,
      type: "gif",
      url,
      name: name || "gif.gif",
      ts: Date.now()
    });
    showToast("GIF enviado", "ok");
  };
})();

// Extra Space settings: text overlay opacity preference (local)
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-space-settings]");
  if (!btn) return;
  const id = btn.getAttribute("data-space-settings");
  const op = prompt("Opacidad del texto del Space (10-100):", localStorage.getItem("orbye_space_opac_"+id) || "100");
  if (op == null) return;
  const n = Math.max(10, Math.min(100, parseInt(op, 10) || 100));
  localStorage.setItem("orbye_space_opac_"+id, String(n));
  alert("Opacidad guardada: " + n + "%");
});

// 18+ Space: minors cannot see banner/full profile
window.orbyeCanViewAdultSpace = function(space) {
  if (!space || !space.is_adult && !space.adult && !space.isAdult) return true;
  if (typeof window.orbyeIsAdult === "function") return !!window.orbyeIsAdult();
  try {
    const u = localStorage.getItem("orbye_demo_user");
    const profiles = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
    return !!(profiles[u] && profiles[u].adultOk);
  } catch { return false; }
};

// Sync Spaces from Supabase so all devices see the same communities
window.orbyeMergeCloudSpaces = function(rows) {
  if (!rows || !rows.length) return;
  let local = [];
  try { local = JSON.parse(localStorage.getItem("orbye_spaces_v1") || localStorage.getItem("orbye_communities_v1") || "[]"); } catch {}
  const bySlug = {};
  local.forEach(s => { if (s && (s.slug || s.id)) bySlug[s.slug || s.id] = s; });
  rows.forEach(r => {
    const slug = r.slug;
    bySlug[slug] = Object.assign({}, bySlug[slug] || {}, {
      id: r.id || slug,
      slug,
      name: r.name,
      description: r.description || "",
      owner: r.owner_username,
      isAdult: !!r.is_adult,
      adult: !!r.is_adult,
      logo: r.logo_url,
      banner: r.banner_url,
      ts: r.created_at ? new Date(r.created_at).getTime() : Date.now()
    });
  });
  const merged = Object.values(bySlug);
  try {
    if (window.orbyeCloud?.enabled) { /* cloud space save elsewhere */ }
    localStorage.setItem("orbye_spaces_v1", JSON.stringify(merged));
    localStorage.setItem("orbye_communities_v1", JSON.stringify(merged));
  } catch {}
  if (typeof window.orbyeRenderSpaces === "function") window.orbyeRenderSpaces();
  if (typeof window.renderSpaces === "function") window.renderSpaces();
};
window.addEventListener("orbye-cloud-ready", async () => {
  if (!window.orbyeCloud?.enabled) return;
  try {
    const rows = await window.orbyeCloud.listSpaces(80);
    window.orbyeMergeCloudSpaces(rows);
  } catch (e) { console.warn(e); }
});

// Push local space creates to cloud
(function() {
  const _set = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k, v) {
    _set(k, v);
    if ((k === "orbye_spaces_v1" || k === "orbye_communities_v1") && window.orbyeCloud?.enabled) {
      try {
        const arr = JSON.parse(v || "[]");
        const last = arr[0];
        if (last && last.name) {
          const slug = (last.slug || last.name || "").toLowerCase().replace(/\s+/g, "-").slice(0, 40);
          window.orbyeCloud.createSpace({
            slug: slug || ("space-" + Date.now()),
            name: last.name,
            description: last.description || last.desc || "",
            owner: last.owner || last.user || localStorage.getItem("orbye_demo_user"),
            isAdult: !!(last.isAdult || last.adult),
            logoUrl: last.logo || null,
            bannerUrl: last.banner || null
          }).catch(() => {});
        }
      } catch (_) {}
    }
  };
})();

// SPACE_MODEL_3D — modelo 3D por Space (como estilo de comunidad)
window.orbyeSetSpaceModel3d = function(spaceId, dataUrl, title) {
  try {
    const KEY = "orbye_spaces_v1";
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    const s = list.find(x => x.id === spaceId || x.name === spaceId);
    if (!s) return false;
    s.model3d = { url: dataUrl, title: title || "Modelo", ts: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch { return false; }
};
window.orbyeGetSpaceModel3d = function(spaceId) {
  try {
    const list = JSON.parse(localStorage.getItem("orbye_spaces_v1") || "[]");
    const s = list.find(x => x.id === spaceId || x.name === spaceId);
    return s && s.model3d ? s.model3d : null;
  } catch { return null; }
};

// SPACE_JOIN_UI
(function(){
  document.addEventListener("click", function(e){
    var btn = e.target && e.target.closest && e.target.closest("[data-space-join]");
    if(btn){
      e.preventDefault();
      var id = btn.getAttribute("data-space-join");
      if(window.orbyeSpaceJoin) window.orbyeSpaceJoin(id);
    }
    var leave = e.target && e.target.closest && e.target.closest("[data-space-leave]");
    if(leave){
      e.preventDefault();
      var id2 = leave.getAttribute("data-space-leave");
      if(window.orbyeSpaceLeave) window.orbyeSpaceLeave(id2);
    }
  });
})();
