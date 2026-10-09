
/* V157: never show gray panel */
(function(){
  var _orig = null;
  function hideGray(){
    var p = document.getElementById("globalChatPanel");
    if(p){ p.hidden=true; p.style.display="none"; p.style.visibility="hidden"; }
  }
  setInterval(hideGray, 500);
  document.addEventListener("click", function(e){
    if(e.target.closest("#globalChatOpen")){
      e.preventDefault(); e.stopPropagation();
      hideGray();
      if(typeof window.__orbyeOpenOnyx==="function") window.__orbyeOpenOnyx();
    }
  }, true);
})();

(() => {
  const GKEY = "orbye_global_chat_v1";
  function dedupeMsgs(list){
    const seen = new Set();
    const out = [];
    (list||[]).forEach(m => {
      const k = (m.id || "") + "|" + (m.user||"") + "|" + (m.text||"") + "|" + Math.floor((m.ts||0)/2000);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(m);
    });
    return out;
  }


  function isPingMsg(m){
    const u = String(m && m.user || m && m.author || "");
    const t = String(m && m.text || m && m.body || "");
    if (u === "OrbyE" && (/^PING_/i.test(t) || /^ORBYE_PING/i.test(t))) return true;
    if (/^PING_\d+$/i.test(t)) return true;
    return false;
  }

  function chatRestBase(){ return (window.ORBYE_SUPABASE_URL||"").replace(/\/$/,""); }
  function chatRestKey(){ return window.ORBYE_SUPABASE_ANON_KEY||window.__orbyeWorkingKey||""; }
  function chatRestHeaders(){
    const k = chatRestKey();
    return { apikey:k, Authorization:"Bearer "+k, Accept:"application/json", "Content-Type":"application/json", Prefer:"return=representation" };
  }
  async function orbyeChatRestSend(msg){
    const base = chatRestBase(); const k = chatRestKey();
    if(!base||!k) return null;
    const id = msg.id || ("g"+Date.now()+"_"+Math.random().toString(36).slice(2,7));
    const body = {
      id: id,
      author_username: msg.user || msg.author || "anon",
      body: msg.text || msg.body || "",
      media_url: (msg.media && msg.media.url && String(msg.media.url).indexOf("data:")!==0) ? msg.media.url : (msg.mediaUrl || null),
      media_type: (msg.media && msg.media.type) || msg.mediaType || null,
      created_at: new Date(msg.ts || Date.now()).toISOString()
    };
    try{
      const res = await fetch(base+"/rest/v1/global_messages", { method:"POST", headers:chatRestHeaders(), body: JSON.stringify([body]) });
      if(res.ok || res.status===201) return body;
      // try without id
      const res2 = await fetch(base+"/rest/v1/global_messages", { method:"POST", headers:chatRestHeaders(), body: JSON.stringify([{ author_username:body.author_username, body:body.body, media_url:body.media_url, media_type:body.media_type }]) });
      if(res2.ok || res2.status===201){ try{ return (await res2.json())[0]||body; }catch(e){ return body; } }
      console.warn("chat REST fail", res.status, await res.text().catch(()=>""));
      return null;
    }catch(e){ console.warn(e); return null; }
  }
  async function orbyeChatRestPull(){
    const base = chatRestBase(); const k = chatRestKey();
    if(!base||!k) return null;
    try{
      const res = await fetch(base+"/rest/v1/global_messages?select=id,author_username,body,media_url,media_type,created_at&order=created_at.asc&limit=200", { headers:chatRestHeaders() });
      if(!res.ok) return null;
      const rows = await res.json();
      return rows.map(r => ({
        id: r.id,
        user: r.author_username,
        text: r.body || "",
        media: r.media_url ? { type: r.media_type || "image", url: r.media_url } : null,
        ts: r.created_at ? new Date(r.created_at).getTime() : Date.now()
      }));
    }catch(e){ return null; }
  }
  window.orbyeChatRestSend = orbyeChatRestSend;
  window.orbyeChatRestPull = orbyeChatRestPull;
  (function purgePingLocal(){
    try {
      let list = JSON.parse(localStorage.getItem(GKEY)||"[]");
      const n = list.length;
      list = list.filter(m => !isPingMsg(m));
      if (list.length !== n) localStorage.setItem(GKEY, JSON.stringify(list));
    } catch(e){}
  })();

  const MKEY = "orbye_mod_chat_v1";
  const MODS_KEY = "orbye_global_mods_v1";

  function getUser() { return localStorage.getItem("orbye_demo_user"); }
  function isAdmin() {
    const u = getUser();
    if (u === "DavidAvila") return true;
    try {
      const accounts = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
      if (accounts[u] && (accounts[u].role === "admin" || accounts[u].email === "avilarodriguezdavid13@gmail.com")) return true;
    } catch {}
    return false;
  }
  function loadMods() {
    try { return JSON.parse(localStorage.getItem(MODS_KEY) || "[]"); } catch { return []; }
  }
  function saveMods(a) { localStorage.setItem(MODS_KEY, JSON.stringify(a)); }
  function isMod() {
    const u = getUser();
    if (!u) return false;
    if (isAdmin()) return true;
    if (loadMods().includes(u)) return true;
    if (typeof window.isOrbyeModUser === "function" && window.isOrbyeModUser(u)) return true;
    return false;
  }
  window.orbyeIsGlobalMod = isMod;
  window.orbyeGrantMod = function(username) {
    if (!isAdmin()) return false;
    const m = loadMods();
    if (!m.includes(username)) { m.push(username); saveMods(m); }
    return true;
  };

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[c]));
  }
  function load(key) {
    try {
      return dedupeMsgs(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return []; }
  }
  function save(key, list) {
    if (list.length > 200) list = list.slice(0, 200);
    try { localStorage.setItem(key, JSON.stringify(list)); }
    catch { localStorage.setItem(key, JSON.stringify(list.slice(0, 50))); }
  }

  function mediaHtml(m) {
    if (!m.media) return "";
    if (m.media.type === "image" || m.media.type === "gif")
      return `<img class="gchat-media" src="${m.media.url}" alt="">`;
    if (m.media.type === "video")
      return `<video class="gchat-media" controls playsinline src="${m.media.url}"></video>`;
    if (m.media.type === "project")
      return `<div class="gchat-project"><b>📦 Proyecto</b><p>${esc(m.media.title || "")}</p>
        ${m.media.url ? `<a href="${esc(m.media.url)}" target="_blank" rel="noopener">Abrir</a>` : ""}
        ${m.media.note ? `<small>${esc(m.media.note)}</small>` : ""}</div>`;
    return "";
  }

  function linkify(text) {
    const t = esc(text);
    return t.replace(/(https?:\/\/[^\s<]+)|(#orbytube\?v=[\w-]+)/g, (m) => {
      if (m.startsWith("#")) return `<a href="${m}" class="orbye-deeplink">${m}</a>`;
      return `<a href="${m}" target="_blank" rel="noopener">${m}</a>`;
    });
  }
  function render(listEl, key) {
    if (!listEl) return;
    let list = load(arguments[1] || GKEY); list = (list||[]).filter(m => !isPingMsg(m));
    listEl.innerHTML = list.length
      ? list.map(m => {
          const av = (typeof window.orbyeAvatarHtml === "function")
            ? window.orbyeAvatarHtml(m.user, "sm")
            : `<span class="gchat-av-fallback">${esc((m.user||"?").charAt(0).toUpperCase())}</span>`;
          const me = getUser();
          const canDel = me && (m.user === me || isMod());
          return `<div class="gchat-msg" data-mid="${esc(m.id || "")}">
          <button type="button" class="gchat-av user-hit" data-user="${esc(m.user)}" title="${esc(m.user)}">${av}</button>
          <div class="gchat-body">
            <div class="gchat-head">
              <b class="user-hit" data-user="${esc(m.user)}">${esc(m.user)}</b>
              <span class="gchat-actions">
                ${canDel ? `<button type="button" class="gchat-del" data-del-msg="${esc(m.id||m.ts||"")}" data-ckey="${key}">Eliminar</button>` : ""}
                <button type="button" class="gchat-report" data-report-user="${esc(m.user)}">Reportar</button>
              </span>
            </div>
            ${m.text ? `<span class="gchat-text">${linkify(m.text)}</span>` : ""}
            ${mediaHtml(m)}
            <small>${new Date(m.ts).toLocaleString()}</small>
          </div>
        </div>`;
        }).join("")
      : '<p class="muted">Sin mensajes aún.</p>';
    listEl.scrollTop = listEl.scrollHeight;
  }

  const pending = { global: null, mod: null };

  function readFile(file, cb) {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      alert("Archivo máx. 6 MB");
      return;
    }
    const r = new FileReader();
    r.onload = () => cb(r.result, file);
    r.readAsDataURL(file);
  }

  function bindCompose(prefix, key, listId, allowProject) {
    const sendBtn = document.getElementById(prefix + "Send");
    const input = document.getElementById(prefix + "Input");
    const fileInput = document.getElementById(prefix + "File");
    const pick = document.getElementById(prefix + "Pick");
    const prev = document.getElementById(prefix + "Prev");

    pick?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      readFile(f, (url, file) => {
        let type = "image";
        if (file.type.startsWith("video/")) type = "video";
        else if (file.type === "image/gif" || /\.gif$/i.test(file.name)) type = "gif";
        pending[prefix === "globalChat" ? "global" : "mod"] = { type, url, name: file.name };
        if (prev) {
          prev.hidden = false;
          prev.innerHTML = type === "video"
            ? `<video src="${url}" controls playsinline></video><button type="button" data-clr="${prefix}">×</button>`
            : `<img src="${url}" alt=""><button type="button" data-clr="${prefix}">×</button>`;
        }
      });
    });

    document.addEventListener("click", e => {
      if (e.target.dataset.clr === prefix) {
        pending[prefix === "globalChat" ? "global" : "mod"] = null;
        if (prev) { prev.hidden = true; prev.innerHTML = ""; }
        if (fileInput) fileInput.value = "";
      }
    });

    // GIF via picker
    const gifBtn = document.getElementById(prefix + "Gif") || document.getElementById(prefix + "GifBtn");
    gifBtn?.addEventListener("click", () => {
      window._gchatTarget = prefix === "globalChat" ? "global" : "mod";
      if (typeof window.orbyeOpenGifPicker === "function") {
        window.orbyeOpenGifPicker("chat", document.getElementById(prefix + "Gif"));
      }
    });

    function doSend() {
      if (window.__onyxSendLock) return; // Onyx handler owns send — evita duplicados
      const user = getUser();
      if (!user) {
        const ap = document.getElementById("accountPanel");
        if (ap) { ap.hidden = false; ap.style.display = "flex"; }
        return;
      }
      if (key === MKEY && !isMod()) {
        alert("Solo moderadores");
        return;
      }
      const text = (input?.value || "").trim();
      const pk = prefix === "globalChat" ? "global" : "mod";
      let media = pending[pk];
      // project from mod fields
      if (allowProject) {
        const pt = (document.getElementById("modProjectTitle")?.value || "").trim();
        const pu = (document.getElementById("modProjectUrl")?.value || "").trim();
        const pn = (document.getElementById("modProjectNote")?.value || "").trim();
        if (pt || pu) {
          media = { type: "project", title: pt, url: pu, note: pn };
        }
      }
      if (!text && !media) return;
      const list = load(key);
      list.push({ id: crypto.randomUUID(), user, text, media, ts: Date.now() });
      save(key, list);
      if (key === GKEY) {
        const payload = { id: list[list.length-1]?.id, user, text: (typeof window.orbyeCensorText==='function' ? window.orbyeCensorText(text) : text), media, ts: Date.now() };
        (async function(){
          let row = null;
          try {
            if (window.orbyeCloud?.enabled && window.orbyeCloud.sendChat) {
              row = await window.orbyeCloud.sendChat({
                author: user,
                body: payload.text,
                mediaUrl: media && media.url && String(media.url).indexOf("data:") !== 0 ? media.url : null,
                mediaType: media && media.type
              });
            }
          } catch (e) { console.warn(e); }
          if (!row && typeof orbyeChatRestSend === "function") {
            row = await orbyeChatRestSend(payload);
          }
          if (row && row.id) {
            const L = load(key);
            const last = L[L.length - 1];
            if (last && last.user === user) { last.id = row.id; last._cloudSynced = true; save(key, L); }
          } else {
            console.warn("chat no sincronizado — ejecuta SUPABASE_GLOBAL_CHAT_FIX.sql");
          }
        })();
      }
      if (input) input.value = "";
      pending[pk] = null;
      if (prev) { prev.hidden = true; prev.innerHTML = ""; }
      if (fileInput) fileInput.value = "";
      if (allowProject) {
        ["modProjectTitle", "modProjectUrl", "modProjectNote"].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = "";
        });
      }
      render(document.getElementById(listId), key);
    }

    sendBtn?.addEventListener("click", doSend);
    input?.addEventListener("keydown", e => { if (e.key === "Enter") doSend(); });
  }

  // Bridge GIF into chat
  const prevChatGif = window.orbyeSetChatGif;
  window.orbyeSetChatGif = function(url, name) {
    const t = window._gchatTarget || "global";
    pending[t] = { type: "gif", url, name: name || "gif.gif" };
    const prefix = t === "global" ? "globalChat" : "modChat";
    const prev = document.getElementById(prefix + "Prev");
    if (prev) {
      prev.hidden = false;
      prev.innerHTML = `<img src="${url}" alt="gif"><button type="button" data-clr="${prefix}">×</button>`;
    }
    if (prevChatGif) prevChatGif(url, name);
  };

  function ensureComposeUI() {
    // Inject compact OrbyPload into global/mod panels if missing
    const specs = [
      { panel: "globalChatPanel", prefix: "globalChat", list: "globalChatList", project: false },
      { panel: "modChatPanel", prefix: "modChat", list: "modChatList", project: true }
    ];
    specs.forEach(s => {
      const box = document.querySelector("#" + s.panel + " .global-chat-compose");
      if (!box || document.getElementById(s.prefix + "Pick")) return;
      const tools = document.createElement("div");
      tools.className = "gchat-tools";
      tools.innerHTML = `
        <input type="file" id="${s.prefix}File" accept="image/*,video/*,.gif,image/gif" hidden>
        <button type="button" class="gchat-pload gchat-pload-lg" id="${s.prefix}Pick" title="OrbyPload">OrbyPload</button>
        <button type="button" class="gchat-pload gchat-pload-lg" id="${s.prefix}Gif" title="GIF">GIF</button>
        ${s.project ? `<details class="mod-project-details"><summary>📦 Proyecto</summary>
          <input id="modProjectTitle" placeholder="Nombre del proyecto" maxlength="60">
          <input id="modProjectUrl" placeholder="Link o nota" maxlength="200">
          <input id="modProjectNote" placeholder="Descripción corta" maxlength="120">
        </details>` : ""}
        <div id="${s.prefix}Prev" class="gchat-prev" hidden></div>
      `;
      box.parentNode.insertBefore(tools, box);
      bindCompose(s.prefix, s.prefix === "globalChat" ? GKEY : MKEY, s.list, s.project);
    });
  }

  document.getElementById("globalChatOpen")?.addEventListener("click", e => {
    e.preventDefault();
    const p = document.getElementById("globalChatPanel");
    if (p) {
      p.hidden = false;
      p.style.display = "flex";
      p.classList.add("chat-stage-open");
    }
    ensureComposeUI();
    render(document.getElementById("globalChatList"), GKEY);
    const gin = document.getElementById("globalChatInput");
    if (gin) { gin.disabled = false; gin.readOnly = false; setTimeout(() => gin.focus(), 100); }
    function pullCloudChat() {
      if (!window.orbyeCloud?.enabled) return;
      window.orbyeCloud.listChat(120).then(rows => {
        if (!rows || !rows.length) {
          const badge = document.getElementById("orbye-cloud-badge");
          if (badge) {
            badge.textContent = "☁ Nube vacía · subiendo local…";
            badge.style.background = "#a60";
          }
          // Intentar subir lo local a la nube para que la otra laptop lo vea
          if (window.orbyePushLocalChat) {
            window.orbyePushLocalChat().then(n => {
              if (badge) {
                badge.textContent = n ? ("☁ Subidos " + n + " · refresca otra laptop") : "☁ Nube vacía (nada que subir)";
                badge.style.background = n ? "#0a2" : "#a60";
              }
            });
          }
          return; // NEVER wipe local with empty cloud
        }
        const mapped = rows.map(r => ({
          id: r.id,
          user: r.author_username,
          text: r.body || "",
          media: r.media_url ? { type: r.media_type || "image", url: r.media_url } : null,
          ts: new Date(r.created_at).getTime()
        }));
        // Merge: cloud wins for same id; keep local-only until synced
        const local = load(GKEY);
        const byId = {};
        local.forEach(m => {
          const k = m.id || (m.user + "_" + m.ts);
          byId[k] = m;
        });
        mapped.forEach(m => { byId[m.id] = m; });
        const merged = Object.values(byId).sort((a, b) => (a.ts || 0) - (b.ts || 0));
        save(GKEY, merged.slice(-200));
        const listEl = document.getElementById("globalChatList");
        if (listEl && !document.getElementById("globalChatPanel")?.hidden) {
          render(listEl, GKEY);
        }
        const badge = document.getElementById("orbye-cloud-badge");
        if (badge) badge.textContent = "☁ Supabase · chat " + mapped.length;
      }).catch(err => {
        console.warn("chat pull", err);
        const badge = document.getElementById("orbye-cloud-badge");
        if (badge) badge.textContent = "☁ Chat error";
      });
    }
    pullCloudChat();
    if (window.__orbyeChatPoll) clearInterval(window.__orbyeChatPoll);
    window.__orbyeChatPoll = setInterval(pullCloudChat, 3000);
  });
  document.getElementById("closeGlobalChat")?.addEventListener("click", () => {
    const p = document.getElementById("globalChatPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
    if (window.__orbyeChatPoll) { clearInterval(window.__orbyeChatPoll); window.__orbyeChatPoll = null; }
  });

  document.getElementById("modChatOpen")?.addEventListener("click", e => {
    e.preventDefault();
    if (!isMod()) { alert("Solo moderadores y el creador."); return; }
    const p = document.getElementById("modChatPanel");
    if (p) {
      p.hidden = false;
      p.style.display = "flex";
      p.classList.add("chat-stage-open");
    }
    const grant = document.getElementById("modGrantBox");
    if (grant) grant.hidden = !isAdmin();
    ensureComposeUI();
    render(document.getElementById("modChatList"), MKEY);
  });
  document.getElementById("closeModChat")?.addEventListener("click", () => {
    const p = document.getElementById("modChatPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
  });

  // legacy send buttons if compose already in HTML
  document.getElementById("globalChatSend")?.addEventListener("click", () => {
    ensureComposeUI();
    /* blocked recursive click */
  });

  document.getElementById("modGrantBtn")?.addEventListener("click", () => {
    if (!isAdmin()) return;
    const u = (document.getElementById("modGrantUser")?.value || "").trim();
    const msg = document.getElementById("modGrantMsg");
    if (!u) { if (msg) msg.textContent = "Escribe un usuario"; return; }
    window.orbyeGrantMod(u);
    if (msg) msg.textContent = u + " ahora es moderador.";
    if (typeof window.orbyeNotify === "function") {
      window.orbyeNotify(u, "Te dieron rol de moderador en OrbyE", "staff", "#inicio");
    }
  });

  // DMCA mini desk
  function openDmcaMini() {
    const d = document.getElementById("dmcaMiniDesk");
    if (d) { d.hidden = false; }
  }
  document.getElementById("openDmcaMini")?.addEventListener("click", e => {
    e.preventDefault();
    openDmcaMini();
  });
  document.getElementById("dmcaMiniClose")?.addEventListener("click", () => {
    const d = document.getElementById("dmcaMiniDesk");
    if (d) d.hidden = true;
  });
  // drag mini
  (function() {
    const desk = document.getElementById("dmcaMiniDesk");
    const handle = document.getElementById("dmcaMiniDrag");
    if (!desk || !handle) return;
    let drag = null;
    handle.addEventListener("pointerdown", e => {
      if (e.target.closest("button") || e.target.id === "dmcaMiniClose") return;
      const r = desk.getBoundingClientRect();
      drag = { x: e.clientX - r.left, y: e.clientY - r.top };
      try { handle.setPointerCapture(e.pointerId); } catch(_){}
      e.preventDefault();
    });
    handle.addEventListener("pointermove", e => {
      if (!drag) return;
      desk.style.position = "fixed";
      desk.style.left = Math.max(0, e.clientX - drag.x) + "px";
      desk.style.top = Math.max(0, e.clientY - drag.y) + "px";
      desk.style.right = "auto";
      desk.style.bottom = "auto";
    });
    handle.addEventListener("pointerup", () => { drag = null; });
    handle.addEventListener("pointercancel", () => { drag = null; });
  })();

  document.getElementById("dmcaMiniClose")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const d = document.getElementById("dmcaMiniDesk");
    if (d) d.hidden = true;
  }, true);

  document.getElementById("openDmcaMini2")?.addEventListener("click", e => {
    e.preventDefault();
    const d = document.getElementById("dmcaMiniDesk");
    if (d) d.hidden = false;
  });

  document.getElementById("dmcaMiniSend")?.addEventListener("click", () => {
    const name = document.getElementById("dmcaName2")?.value?.trim();
    const url = document.getElementById("dmcaUrl2")?.value?.trim();
    const desc = document.getElementById("dmcaDesc2")?.value?.trim();
    const swear = document.getElementById("dmcaSwear2")?.checked;
    const msg = document.getElementById("dmcaMiniMsg");
    if (!name || !url || !desc || !swear) {
      if (msg) msg.textContent = "Completa nombre, URL, detalle y casilla.";
      return;
    }
    const notice = { id: crypto.randomUUID(), name, email: "", url, desc, sign: name, ts: Date.now(), status: "pending" };
    let list = [];
    try { list = JSON.parse(localStorage.getItem("orbye_dmca_notices_v1") || "[]"); } catch {}
    list.unshift(notice);
    localStorage.setItem("orbye_dmca_notices_v1", JSON.stringify(list.slice(0, 30)));
    if (typeof window.orbyeNotify === "function") {
      window.orbyeNotify("DavidAvila", "DMCA de " + name + ": " + url.slice(0, 60), "dmca", "#dmca");
    }
    if (msg) msg.textContent = "Enviado. Ref " + notice.id.slice(0, 8);
    ["dmcaName2","dmcaUrl2","dmcaDesc2"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  });
})();


  // Delete own/mod messages
  document.addEventListener("click", e => {
    const del = e.target.closest("[data-del-msg], .gchat-del");
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      const id = del.getAttribute("data-del-msg") || "";
      const key = del.getAttribute("data-ckey") || GKEY;
      const me = getUser();
      if (!me) { alert("Inicia sesión"); return; }
      let list = load(key);
      let idx = list.findIndex(m => String(m.id) === String(id) || String(m.ts) === String(id));
      if (idx < 0) {
        // match row index from DOM
        const row = del.closest(".gchat-msg");
        const rows = row && row.parentElement ? Array.from(row.parentElement.children) : [];
        const ridx = rows.indexOf(row);
        if (ridx >= 0 && ridx < list.length) idx = ridx;
      }
      if (idx < 0) {
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].user === me) { idx = i; break; }
        }
      }
      if (idx < 0) return;
      const msg = list[idx];
      if (msg.user !== me && !isMod()) { alert("No puedes borrar este mensaje"); return; }
      list.splice(idx, 1);
      save(key, list);
      if (key === GKEY && window.orbyeCloud?.enabled && msg.id) {
        try {
          if (window.orbyeCloud.deleteChatMessage) window.orbyeCloud.deleteChatMessage(msg.id);
          else if (window.orbyeCloud.client) window.orbyeCloud.client.from("global_messages").delete().eq("id", msg.id).then(()=>{});
        } catch(_){}
      }
      const listId = key === MKEY ? "modChatList" : "globalChatList";
      render(document.getElementById(listId), key);
      return;
    }
    const rep = e.target.closest("[data-report-user]");
    if (rep) {
      e.preventDefault();
      const u = rep.getAttribute("data-report-user");
      if (typeof window.orbyeOpenReportUser === "function") window.orbyeOpenReportUser(u);
    }
    const fs = e.target.closest("#globalChatFullscreen, #modChatFullscreen");
    if (fs) {
      e.preventDefault();
      const panel = fs.closest(".account-panel");
      if (panel) panel.classList.toggle("chat-fullscreen");
    }
  });

  window.orbyeOpenReportUser = function(username) {
    const box = document.getElementById("reportUserPanel");
    const who = document.getElementById("reportUserName");
    if (who) who.textContent = username || "";
    const hid = document.getElementById("reportUserTarget");
    if (hid) hid.value = username || "";
    if (box) {
      box.hidden = false;
      box.style.display = "flex";
    }
  };

  document.getElementById("closeReportUser")?.addEventListener("click", () => {
    const box = document.getElementById("reportUserPanel");
    if (box) { box.hidden = true; box.style.display = "none"; }
  });

  document.getElementById("reportUserSubmit")?.addEventListener("click", () => {
    const target = document.getElementById("reportUserTarget")?.value || "";
    const reason = (document.getElementById("reportUserReason")?.value || "").trim();
    const me = getUser();
    const msg = document.getElementById("reportUserMsg");
    if (!me) {
      if (msg) msg.textContent = "Inicia sesión para reportar.";
      return;
    }
    if (!target || reason.length < 15) {
      if (msg) msg.textContent = "Describe qué pasó (mín. 15 caracteres). Los mods revisarán el caso.";
      return;
    }
    const reports = JSON.parse(localStorage.getItem("orbye_user_reports_v1") || "[]");
    reports.unshift({
      id: String(Date.now()),
      target,
      by: me,
      reason,
      ts: Date.now(),
      status: "pending"
    });
    localStorage.setItem("orbye_user_reports_v1", JSON.stringify(reports.slice(0, 100)));
    // notify mods/admin
    if (typeof window.orbyeNotify === "function") {
      window.orbyeNotify("DavidAvila", "Reporte de usuario: @" + target, "report", "#staff");
      loadMods().forEach(m => {
        try { window.orbyeNotify(m, "Reporte de usuario: @" + target, "report", "#staff"); } catch (_) {}
      });
    }
    if (msg) msg.textContent = "Reporte enviado. Moderadores revisarán el caso. Si es falso, no se tomará acción.";
    setTimeout(() => {
      const box = document.getElementById("reportUserPanel");
      if (box) { box.hidden = true; box.style.display = "none"; }
    }, 1800);
  });


  // Username autocomplete when typing a letter / @
  function allKnownUsers() {
    const set = new Set();
    try {
      const acc = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
      Object.keys(acc).forEach(u => set.add(u));
    } catch {}
    try {
      const prof = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
      Object.keys(prof).forEach(u => set.add(u));
    } catch {}
    load(GKEY).forEach(m => { if (m.user) set.add(m.user); });
    const me = getUser();
    if (me) set.add(me);
    return Array.from(set);
  }
  function bindSuggest(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input._orbyeSuggest) return;
    input._orbyeSuggest = true;
    let box = document.getElementById(inputId + "Suggest");
    if (!box) {
      box = document.createElement("div");
      box.id = inputId + "Suggest";
      box.className = "chat-suggest";
      box.hidden = true;
      input.parentNode.style.position = "relative";
      input.parentNode.appendChild(box);
    }
    input.addEventListener("input", () => {
      const v = input.value;
      const m = v.match(/(?:^|\s)@?([a-zA-Z0-9_]{1,24})$/);
      if (!m) { box.hidden = true; return; }
      const q = m[1].toLowerCase();
      const hits = allKnownUsers().filter(u => u.toLowerCase().startsWith(q)).slice(0, 6);
      if (!hits.length) { box.hidden = true; return; }
      box.innerHTML = hits.map(u => `<button type="button" data-sug="${u}">@${u}</button>`).join("");
      box.hidden = false;
    });
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-sug]");
      if (!b) return;
      const u = b.getAttribute("data-sug");
      input.value = input.value.replace(/@?([a-zA-Z0-9_]{1,24})$/, "@" + u + " ");
      box.hidden = true;
      input.focus();
    });
  }
  document.getElementById("globalChatOpen")?.addEventListener("click", () => {
    setTimeout(() => bindSuggest("globalChatInput"), 100);
  });
  document.getElementById("modChatOpen")?.addEventListener("click", () => {
    setTimeout(() => bindSuggest("modChatInput"), 100);
  });

// DEL_CAPTURE — school browsers sometimes block nested handlers
document.addEventListener("click", function(e) {
  const btn = e.target.closest(".gchat-del, [data-del-msg]");
  if (!btn) return;
  if (btn.closest("#groupChatList")) return; // groups handles own
  e.preventDefault();
  e.stopPropagation();
  const me = localStorage.getItem("orbye_demo_user");
  if (!me) return;
  const row = btn.closest(".gchat-msg");
  const listEl = row && row.parentElement;
  const key = btn.getAttribute("data-ckey") || "orbye_global_chat_v1";
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
  const id = btn.getAttribute("data-del-msg");
  let idx = list.findIndex(m => String(m.id) === String(id) || String(m.ts) === String(id));
  if (idx < 0 && listEl && row) {
    const rows = Array.from(listEl.querySelectorAll(".gchat-msg"));
    idx = rows.indexOf(row);
  }
  if (idx < 0) return;
  const msg = list[idx];
  if (!msg) return;
  const isMod = (me || "").toLowerCase() === "davidavila";
  if (msg.user !== me && !isMod) return;
  list.splice(idx, 1);
  localStorage.setItem(key, JSON.stringify(list));
  if (msg.id && window.orbyeCloud?.deleteChatMessage) window.orbyeCloud.deleteChatMessage(msg.id);
  row.remove();
}, true);

// FAST_CHAT_POLL when panel visible
setInterval(() => {
  const p = document.getElementById("globalChatPanel");
  if (p && !p.hidden && window.orbyeCloud?.enabled) {
    try {
      // trigger existing pull if defined in closure - use cloud list via event
      window.dispatchEvent(new CustomEvent("orbye-force-chat-pull"));
    } catch (_) {}
  }
}, 4000);

// PUSH_LOCAL_TO_CLOUD — sube mensajes locales que nunca llegaron a Supabase
async function pushLocalChatToCloud() {
  if (!window.orbyeCloud?.enabled || !window.orbyeCloud.sendChat) return;
  const GKEY = "orbye_global_chat_v1";
  function dedupeMsgs(list){
    const seen = new Set();
    const out = [];
    (list||[]).forEach(m => {
      const k = (m.id || "") + "|" + (m.user||"") + "|" + (m.text||"") + "|" + Math.floor((m.ts||0)/2000);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(m);
    });
    return out;
  }


  function isPingMsg(m){
    const u = String(m && m.user || m && m.author || "");
    const t = String(m && m.text || m && m.body || "");
    if (u === "OrbyE" && (/^PING_/i.test(t) || /^ORBYE_PING/i.test(t))) return true;
    if (/^PING_\d+$/i.test(t)) return true;
    return false;
  }

  function chatRestBase(){ return (window.ORBYE_SUPABASE_URL||"").replace(/\/$/,""); }
  function chatRestKey(){ return window.ORBYE_SUPABASE_ANON_KEY||window.__orbyeWorkingKey||""; }
  function chatRestHeaders(){
    const k = chatRestKey();
    return { apikey:k, Authorization:"Bearer "+k, Accept:"application/json", "Content-Type":"application/json", Prefer:"return=representation" };
  }
  async function orbyeChatRestSend(msg){
    const base = chatRestBase(); const k = chatRestKey();
    if(!base||!k) return null;
    const id = msg.id || ("g"+Date.now()+"_"+Math.random().toString(36).slice(2,7));
    const body = {
      id: id,
      author_username: msg.user || msg.author || "anon",
      body: msg.text || msg.body || "",
      media_url: (msg.media && msg.media.url && String(msg.media.url).indexOf("data:")!==0) ? msg.media.url : (msg.mediaUrl || null),
      media_type: (msg.media && msg.media.type) || msg.mediaType || null,
      created_at: new Date(msg.ts || Date.now()).toISOString()
    };
    try{
      const res = await fetch(base+"/rest/v1/global_messages", { method:"POST", headers:chatRestHeaders(), body: JSON.stringify([body]) });
      if(res.ok || res.status===201) return body;
      // try without id
      const res2 = await fetch(base+"/rest/v1/global_messages", { method:"POST", headers:chatRestHeaders(), body: JSON.stringify([{ author_username:body.author_username, body:body.body, media_url:body.media_url, media_type:body.media_type }]) });
      if(res2.ok || res2.status===201){ try{ return (await res2.json())[0]||body; }catch(e){ return body; } }
      console.warn("chat REST fail", res.status, await res.text().catch(()=>""));
      return null;
    }catch(e){ console.warn(e); return null; }
  }
  async function orbyeChatRestPull(){
    const base = chatRestBase(); const k = chatRestKey();
    if(!base||!k) return null;
    try{
      const res = await fetch(base+"/rest/v1/global_messages?select=id,author_username,body,media_url,media_type,created_at&order=created_at.asc&limit=200", { headers:chatRestHeaders() });
      if(!res.ok) return null;
      const rows = await res.json();
      return rows.map(r => ({
        id: r.id,
        user: r.author_username,
        text: r.body || "",
        media: r.media_url ? { type: r.media_type || "image", url: r.media_url } : null,
        ts: r.created_at ? new Date(r.created_at).getTime() : Date.now()
      }));
    }catch(e){ return null; }
  }
  window.orbyeChatRestSend = orbyeChatRestSend;
  window.orbyeChatRestPull = orbyeChatRestPull;
  (function purgePingLocal(){
    try {
      let list = JSON.parse(localStorage.getItem(GKEY)||"[]");
      const n = list.length;
      list = list.filter(m => !isPingMsg(m));
      if (list.length !== n) localStorage.setItem(GKEY, JSON.stringify(list));
    } catch(e){}
  })();

  let list = [];
  try { list = JSON.parse(localStorage.getItem(GKEY) || "[]"); } catch { return; }
  let pushed = 0;
  for (const m of list) {
    // uuid de supabase suele tener guiones y largo 36; ids locales pueden ser crypto.randomUUID también
    // Marcamos con _cloudSynced
    if (m._cloudSynced || m.media?.type === "system") continue;
    if (!m.text && !m.media) continue;
    if ((m.user || "") === "OrbyE" && String(m.text || "").startsWith("ORBYE_PING")) continue;
    try {
      const row = await window.orbyeCloud.sendChat({
        author: m.user || "anon",
        body: m.text || "",
        mediaUrl: m.media && m.media.url,
        mediaType: m.media && m.media.type
      });
      if (row && row.id) {
        m.id = row.id;
        m._cloudSynced = true;
        pushed++;
      }
    } catch (e) {
      console.warn("push local msg", e);
    }
  }
  localStorage.setItem(GKEY, JSON.stringify(list));
  const badge = document.getElementById("orbye-cloud-badge");
  if (badge && pushed) badge.textContent = "☁ Subidos " + pushed + " msgs";
  return pushed;
}
window.orbyePushLocalChat = pushLocalChatToCloud;

// Botón sincronizar chat
document.addEventListener("DOMContentLoaded", () => {
  const compose = document.querySelector("#globalChatPanel .global-chat-compose");
  if (compose && !document.getElementById("btnSyncChat")) {
    const b = document.createElement("button");
    b.type = "button";
    b.id = "btnSyncChat";
    b.className = "button outline";
    b.textContent = "Sincronizar";
    b.title = "Subir mensajes locales y bajar de la nube";
    b.addEventListener("click", async () => {
      b.textContent = "…";
      if (window.orbyePushLocalChat) await window.orbyePushLocalChat();
      window.dispatchEvent(new CustomEvent("orbye-force-chat-pull"));
      // direct pull
      if (window.orbyeCloud?.listChat) {
        const rows = await window.orbyeCloud.listChat(120);
        const badge = document.getElementById("orbye-cloud-badge");
        if (badge) {
          badge.textContent = "☁ Nube: " + (rows?.length || 0) + " msgs";
          badge.style.background = (rows?.length) ? "#0a2" : "#a60";
        }
      }
      b.textContent = "Sincronizar";
    });
    compose.appendChild(b);
  }
});

// BOOT_CHAT_POLL — no esperar a abrir el panel
window.addEventListener("orbye-cloud-ready", () => {
  const pull = async () => {
    if (!window.orbyeCloud?.listChat) return;
    const rows = await window.orbyeCloud.listChat(120);
    const GKEY = "orbye_global_chat_v1";
  function dedupeMsgs(list){
    const seen = new Set();
    const out = [];
    (list||[]).forEach(m => {
      const k = (m.id || "") + "|" + (m.user||"") + "|" + (m.text||"") + "|" + Math.floor((m.ts||0)/2000);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(m);
    });
    return out;
  }


  function isPingMsg(m){
    const u = String(m && m.user || m && m.author || "");
    const t = String(m && m.text || m && m.body || "");
    if (u === "OrbyE" && (/^PING_/i.test(t) || /^ORBYE_PING/i.test(t))) return true;
    if (/^PING_\d+$/i.test(t)) return true;
    return false;
  }

  function chatRestBase(){ return (window.ORBYE_SUPABASE_URL||"").replace(/\/$/,""); }
  function chatRestKey(){ return window.ORBYE_SUPABASE_ANON_KEY||window.__orbyeWorkingKey||""; }
  function chatRestHeaders(){
    const k = chatRestKey();
    return { apikey:k, Authorization:"Bearer "+k, Accept:"application/json", "Content-Type":"application/json", Prefer:"return=representation" };
  }
  async function orbyeChatRestSend(msg){
    const base = chatRestBase(); const k = chatRestKey();
    if(!base||!k) return null;
    const id = msg.id || ("g"+Date.now()+"_"+Math.random().toString(36).slice(2,7));
    const body = {
      id: id,
      author_username: msg.user || msg.author || "anon",
      body: msg.text || msg.body || "",
      media_url: (msg.media && msg.media.url && String(msg.media.url).indexOf("data:")!==0) ? msg.media.url : (msg.mediaUrl || null),
      media_type: (msg.media && msg.media.type) || msg.mediaType || null,
      created_at: new Date(msg.ts || Date.now()).toISOString()
    };
    try{
      const res = await fetch(base+"/rest/v1/global_messages", { method:"POST", headers:chatRestHeaders(), body: JSON.stringify([body]) });
      if(res.ok || res.status===201) return body;
      // try without id
      const res2 = await fetch(base+"/rest/v1/global_messages", { method:"POST", headers:chatRestHeaders(), body: JSON.stringify([{ author_username:body.author_username, body:body.body, media_url:body.media_url, media_type:body.media_type }]) });
      if(res2.ok || res2.status===201){ try{ return (await res2.json())[0]||body; }catch(e){ return body; } }
      console.warn("chat REST fail", res.status, await res.text().catch(()=>""));
      return null;
    }catch(e){ console.warn(e); return null; }
  }
  async function orbyeChatRestPull(){
    const base = chatRestBase(); const k = chatRestKey();
    if(!base||!k) return null;
    try{
      const res = await fetch(base+"/rest/v1/global_messages?select=id,author_username,body,media_url,media_type,created_at&order=created_at.asc&limit=200", { headers:chatRestHeaders() });
      if(!res.ok) return null;
      const rows = await res.json();
      return rows.map(r => ({
        id: r.id,
        user: r.author_username,
        text: r.body || "",
        media: r.media_url ? { type: r.media_type || "image", url: r.media_url } : null,
        ts: r.created_at ? new Date(r.created_at).getTime() : Date.now()
      }));
    }catch(e){ return null; }
  }
  window.orbyeChatRestSend = orbyeChatRestSend;
  window.orbyeChatRestPull = orbyeChatRestPull;
  (function purgePingLocal(){
    try {
      let list = JSON.parse(localStorage.getItem(GKEY)||"[]");
      const n = list.length;
      list = list.filter(m => !isPingMsg(m));
      if (list.length !== n) localStorage.setItem(GKEY, JSON.stringify(list));
    } catch(e){}
  })();

    if (rows && rows.length) {
      const mapped = rows.map(r => ({
        id: r.id,
        user: r.author_username,
        text: r.body || "",
        media: r.media_url ? { type: r.media_type || "image", url: r.media_url } : null,
        ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        _cloudSynced: true
      }));
      let local = [];
      try { local = JSON.parse(localStorage.getItem(GKEY) || "[]"); } catch {}
      const byId = {};
      local.forEach(m => { byId[m.id || (m.user + "_" + m.ts)] = m; });
      mapped.forEach(m => { byId[m.id] = m; });
      const merged = Object.values(byId).sort((a, b) => (a.ts || 0) - (b.ts || 0));
      localStorage.setItem(GKEY, JSON.stringify(merged.slice(-200)));
      const listEl = document.getElementById("globalChatList");
      if (listEl) {
        // simple re-render via event
        window.dispatchEvent(new CustomEvent("orbye-force-chat-pull"));
      }
    }
  };
  pull();
  setInterval(pull, 5000);
});

/* censor outbound global messages */
(function(){
  const _send = window.orbyeSendGlobalMessage;
  if (typeof _send === "function") {
    window.orbyeSendGlobalMessage = function(text) {
      if (typeof window.orbyeCensorText === "function") text = window.orbyeCensorText(text);
      return _send(text);
    };
  }
})();

/* GIF button global chat */
(function(){
  document.addEventListener("click", function(e){
    const btn = e.target.closest("#globalChatGifBtn, [data-gchat-gif], #globalChatGif");
    if(!btn) return;
    e.preventDefault();
    const url = null /* giphy dock */;
    if(!url) return;
    let final = url.trim();
    if(!/^https?:\/\//i.test(final)){
      window.open("https://tenor.com/search/"+encodeURIComponent(final), "_blank");
      final = null;
      if(!final) return;
    }
    const input = document.getElementById("globalChatInput");
    const user = localStorage.getItem("orbye_demo_user");
    if(!user){ alert("Inicia sesión"); return; }
    // set pending media via click send
    try{
      const list = JSON.parse(localStorage.getItem("orbye_global_chat_v1")||"[]");
      const msg = { id: "g"+Date.now(), user, text: (input&&input.value||"").trim(), media: { type:"image", url: final }, ts: Date.now() };
      list.push(msg);
      localStorage.setItem("orbye_global_chat_v1", JSON.stringify(list.slice(-200)));
      if(window.orbyeChatRestSend) window.orbyeChatRestSend(msg);
      if(input) input.value = "";
      const listEl = document.getElementById("globalChatList");
      if(listEl && typeof render === "function"){ /* may be scoped */ }
      // trigger re-open render
      document.getElementById("globalChatOpen")?.click();
      setTimeout(function(){ document.getElementById("globalChatOpen")?.click(); }, 100);
      location.hash = location.hash;
      // force render via pull
      if(window.orbyeChatRestPull){
        window.orbyeChatRestPull().then(function(){
          const ev = new Event("click");
        });
      }
      alert("GIF añadido. Si la otra laptop no lo ve en 5s, revisa SQL global_messages.");
    }catch(err){ console.warn(err); }
  });
})();

/* BULLETPROOF_GCHAT_SEND */
(function(){
  function user(){
    return localStorage.getItem("orbye_demo_user") || "";
  }
  function load(){
    try { return JSON.parse(localStorage.getItem("orbye_global_chat_v1")||"[]"); } catch(e){ return []; }
  }
  function save(list){
    localStorage.setItem("orbye_global_chat_v1", JSON.stringify(list.slice(-200)));
  }
  function isPing(m){
    var t = String(m.text||"");
    return (m.user==="OrbyE" && (/^PING_/i.test(t)||/^ORBYE_PING/i.test(t)));
  }
  function paint(){
    var listEl = document.getElementById("globalChatList");
    if(!listEl) return;
    var list = load().filter(function(m){ return !isPing(m); });
    listEl.innerHTML = list.length ? list.map(function(m){
      var media = "";
      if(m.media && m.media.url){
        if(m.media.type==="video") media = '<video src="'+m.media.url+'" controls playsinline style="max-width:220px;border-radius:10px;margin-top:6px"></video>';
        else media = '<img src="'+m.media.url+'" alt="" style="max-width:220px;border-radius:10px;margin-top:6px;display:block">';
      }
      return '<div class="gchat-row" style="display:flex;gap:10px;padding:10px 6px;border-bottom:1px solid #222">'
        +'<div class="gchat-av" style="width:32px;height:32px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-weight:800">'+(m.user||"?")[0].toUpperCase()+'</div>'
        +'<div style="flex:1"><b class="gchat-user" style="color:#8ab4ff">'+(m.user||"anon")+'</b>'
        +(m.text?('<div class="gchat-text">'+$('<div>').text(m.text).html()+'</div>').replace(/^/, '') : '')
        + (m.text ? '<div class="gchat-text">'+String(m.text).replace(/</g,"&lt;")+'</div>' : '')
        + media
        +'<small style="color:#666">'+new Date(m.ts||Date.now()).toLocaleString()+'</small></div></div>';
    }).join("") : '<p class="muted">Sin mensajes. Escribe abajo y pulsa Enviar.</p>';
    listEl.scrollTop = listEl.scrollHeight;
  }
  // fix broken paint - simplify
  function paint2(){
    var listEl = document.getElementById("globalChatList");
    if(!listEl) return;
    var list = load().filter(function(m){ return !isPing(m); });
    var html = "";
    if(!list.length) html = '<p class="muted" style="padding:12px;color:#888">Sin mensajes. Escribe abajo y pulsa Enviar.</p>';
    else list.forEach(function(m){
      var media = "";
      if(m.media && m.media.url){
        if(m.media.type==="video") media = '<video src="'+m.media.url+'" controls playsinline style="max-width:220px;border-radius:10px;margin-top:6px"></video>';
        else media = '<img src="'+m.media.url+'" alt="" style="max-width:220px;border-radius:10px;margin-top:6px;display:block">';
      }
      html += '<div class="gchat-row" style="display:flex;gap:10px;padding:10px 6px;border-bottom:1px solid #222">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">'+(String(m.user||"?")[0]||"?").toUpperCase()+'</div>'
        +'<div style="flex:1;min-width:0"><b style="color:#8ab4ff">'+String(m.user||"anon").replace(/</g,"")+'</b>'
        +(m.text?'<div style="color:#ddd;margin-top:2px">'+String(m.text).replace(/</g,"&lt;")+'</div>':'')
        +media
        +'<small style="color:#666">'+new Date(m.ts||Date.now()).toLocaleString()+'</small></div></div>';
    });
    listEl.innerHTML = html;
    listEl.scrollTop = listEl.scrollHeight;
  }
  async function sendNow(){
    if (window.__onyxSendLock) return;
    window.__onyxSendLock = true;
    setTimeout(function(){ window.__onyxSendLock = false; }, 800);
    var input = document.getElementById("globalChatInput");
    var text = (input && input.value || "").trim();
    var u = user();
    if(!u){
      alert("Inicia sesión para enviar");
      var ap = document.getElementById("accountPanel");
      if(ap){ ap.hidden=false; ap.style.display="flex"; }
      return;
    }
    if(!text && !(window.__gchatPendingMedia)) return;
    var media = window.__gchatPendingMedia || null;
    var msg = { id: "g"+Date.now()+"_"+Math.random().toString(36).slice(2,6), user:u, text:text, media:media, ts:Date.now() };
    var list = load();
    list.push(msg);
    save(list);
    if(input) input.value = "";
    window.__gchatPendingMedia = null;
    paint2();
    try{
      if(typeof window.orbyeChatRestSend === "function") await window.orbyeChatRestSend(msg);
      else if(window.orbyeCloud && window.orbyeCloud.sendChat){
        await window.orbyeCloud.sendChat({ author:u, body:text, mediaUrl: media&&media.url&&String(media.url).indexOf("data:")!==0?media.url:null, mediaType: media&&media.type });
      }
    }catch(e){ console.warn(e); }
  }
  document.addEventListener("click", function(e){
    if(e.target.closest("#globalChatSend")){
      e.preventDefault();
      e.stopPropagation();
      sendNow();
    }
    if(e.target.closest("#globalChatOpen")){
      setTimeout(paint2, 80);
    }
    if(e.target.closest("#globalChatGifBtn")){
      e.preventDefault(); e.stopPropagation();
      if (window.orbyeOpenGiphyDock) window.orbyeOpenGiphyDock("global", e.target.closest("button"));
    }
    if(e.target.closest("#globalChatPick")){
      var f = document.getElementById("globalChatFile");
      if(f) f.click();
    }
  }, true);
  document.addEventListener("change", function(e){
    if(e.target && e.target.id==="globalChatFile" && e.target.files && e.target.files[0]){
      var file = e.target.files[0];
      if(file.size > 6*1024*1024){ alert("Máx 6MB"); return; }
      var r = new FileReader();
      r.onload = function(){
        var type = file.type.startsWith("video/") ? "video" : "image";
        window.__gchatPendingMedia = { type:type, url:r.result, name:file.name };
        sendNow();
      };
      r.readAsDataURL(file);
    }
  });
  document.addEventListener("keydown", function(e){
    if(e.key==="Enter" && e.target && e.target.id==="globalChatInput"){
      e.preventDefault();
      sendNow();
    }
  });
  setInterval(function(){
    var p = document.getElementById("globalChatPanel");
    if(p && !p.hidden) paint2();
  }, 4000);
})();
