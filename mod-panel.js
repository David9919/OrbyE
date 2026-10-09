(() => {
  const BAN_KEY = "orbye_bans_v1";

  function isMod() {
    try {
      if (typeof window.orbyeIsGlobalMod === "function" && window.orbyeIsGlobalMod()) return true;
    } catch {}
    const role = localStorage.getItem("orbye_demo_role");
    const user = (localStorage.getItem("orbye_demo_user") || "").toLowerCase();
    const email = (localStorage.getItem("orbye_demo_email") || "").toLowerCase();
    if (role === "admin" || role === "mod" || role === "moderator") return true;
    if (user.includes("david") || user.includes("avila")) return true;
    if (email.includes("avilarodriguezdavid")) return true;
    try {
      const mods = JSON.parse(localStorage.getItem("orbye_global_mods_v1") || "[]");
      if (mods.some(x => String(x).toLowerCase() === user || String(x).toLowerCase() === email)) return true;
    } catch {}
    return false;
  }

  function loadBans() {
    try { return JSON.parse(localStorage.getItem(BAN_KEY) || "{}"); } catch { return {}; }
  }
  function saveBans(o) {
    localStorage.setItem(BAN_KEY, JSON.stringify(o));
  }

  window.orbyeIsBanned = function(username) {
    if (!username) return false;
    const bans = loadBans();
    const b = bans[username] || bans[String(username).toLowerCase()];
    if (!b) return false;
    if (b.until && Date.now() > b.until) {
      delete bans[username];
      delete bans[String(username).toLowerCase()];
      saveBans(bans);
      return false;
    }
    return true;
  };
  window.orbyeBanInfo = function(username) {
    const bans = loadBans();
    return bans[username] || bans[String(username).toLowerCase()] || null;
  };

  function openPanel() {
    if (!isMod()) {
      alert("Solo moderadores / admin");
      return;
    }
    let p = document.getElementById("orbyeModPanel");
    if (!p) {
      p = document.createElement("div");
      p.id = "orbyeModPanel";
      p.style.cssText = "position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px";
      p.innerHTML = `
        <div style="background:#12121a;border:1px solid #445;border-radius:16px;padding:18px;max-width:440px;width:94%;color:#ddd;max-height:90vh;overflow:auto">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <strong style="color:#fff;font-size:18px">Panel moderadores</strong>
            <button type="button" id="modPanelClose" style="margin-left:auto;background:transparent;border:0;color:#f88;font-size:22px;cursor:pointer">×</button>
          </div>
          <label style="font-size:12px;display:block;margin-bottom:6px">Usuario a banear</label>
          <input id="modBanUser" placeholder="nombre de usuario" style="width:100%;padding:10px;border-radius:8px;border:1px solid #345;background:#0a0a12;color:#eee;margin-bottom:10px">
          <label style="font-size:12px;display:block;margin-bottom:6px">Duración</label>
          <select id="modBanDur" style="width:100%;padding:10px;border-radius:8px;border:1px solid #345;background:#0a0a12;color:#eee;margin-bottom:10px">
            <option value="3600">1 hora</option>
            <option value="86400">1 día</option>
            <option value="604800">7 días</option>
            <option value="2592000">30 días</option>
            <option value="0">Permanente</option>
          </select>
          <label style="font-size:12px;display:block;margin-bottom:6px">Motivo</label>
          <input id="modBanReason" placeholder="spam, toxicidad..." style="width:100%;padding:10px;border-radius:8px;border:1px solid #345;background:#0a0a12;color:#eee;margin-bottom:12px">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" id="modBanBtn" style="padding:10px 16px;border:0;border-radius:8px;background:#c22;color:#fff;font-weight:700;cursor:pointer">Banear</button>
            <button type="button" id="modUnbanBtn" style="padding:10px 16px;border:0;border-radius:8px;background:#333;color:#fff;cursor:pointer">Quitar ban</button>
          </div>
          <p id="modBanMsg" style="font-size:12px;margin:10px 0 0;color:#8ab"></p>
          <div id="modBanList" style="margin-top:14px;font-size:12px"></div>
        </div>`;
      document.body.appendChild(p);
      document.getElementById("modPanelClose").onclick = () => { p.style.display = "none"; };
      p.onclick = e => { if (e.target === p) p.style.display = "none"; };
      document.getElementById("modBanBtn").onclick = () => {
        const user = (document.getElementById("modBanUser").value || "").trim();
        const sec = Number(document.getElementById("modBanDur").value);
        const reason = (document.getElementById("modBanReason").value || "").trim() || "Sin motivo";
        const msg = document.getElementById("modBanMsg");
        if (!user) { msg.textContent = "Escribe un usuario"; return; }
        const bans = loadBans();
        bans[user] = {
          until: sec === 0 ? null : Date.now() + sec * 1000,
          reason,
          by: localStorage.getItem("orbye_demo_user") || "mod",
          at: Date.now()
        };
        bans[user.toLowerCase()] = bans[user];
        saveBans(bans);
        msg.textContent = "Baneado: " + user + (sec ? " (" + (sec/3600) + " h)" : " (permanente)");
        renderList();
      };
      document.getElementById("modUnbanBtn").onclick = () => {
        const user = (document.getElementById("modBanUser").value || "").trim();
        const bans = loadBans();
        delete bans[user];
        delete bans[user.toLowerCase()];
        saveBans(bans);
        document.getElementById("modBanMsg").textContent = "Ban quitado: " + user;
        renderList();
      };
    }
    p.style.display = "flex";
    renderList();
  }

  function renderList() {
    const el = document.getElementById("modBanList");
    if (!el) return;
    const bans = loadBans();
    const keys = Object.keys(bans).filter((k, i, a) => a.indexOf(k) === i);
    const seen = new Set();
    const rows = [];
    keys.forEach(k => {
      const b = bans[k];
      if (!b || seen.has(JSON.stringify(b))) return;
      seen.add(JSON.stringify(b));
      const until = b.until ? new Date(b.until).toLocaleString() : "Permanente";
      rows.push(`<div style="padding:8px;border:1px solid #333;border-radius:8px;margin-bottom:6px"><b style="color:#fff">${k}</b> · ${until}<br><span style="opacity:.75">${b.reason || ""}</span></div>`);
    });
    el.innerHTML = "<div style='color:#9ab;margin-bottom:6px'>Baneados activos</div>" + (rows.join("") || "<span style='opacity:.6'>Ninguno</span>");
  }

  window.orbyeOpenModPanel = openPanel;

  // Block banned users from chat/send lightly
  document.addEventListener("click", e => {
    if (e.target.closest("#openModPanelBtn")) {
      e.preventDefault();
      openPanel();
    }
  }, true);

  // FAB for mods
  function fab() { /* usa barra izquierda navModPanel */ }
  window.orbyeOpenModPanel = openPanel;

})();
