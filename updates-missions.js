(() => {
  const VER = "1.3.72";
  const VER_KEY = "orbye_last_seen_version";
  const STREAK_KEY = "orbye_login_streak_v1";

  function getUser() { return localStorage.getItem("orbye_demo_user"); }

  // --- Browser notifications ---
  async function ensureNotifPermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      const p = await Notification.requestPermission();
      return p === "granted";
    } catch { return false; }
  }

  window.orbyeBrowserNotify = async function(title, body, href) {
    // in-app toast first
    if (typeof window.orbyeNotify === "function" && getUser()) {
      try { window.orbyeNotify(getUser(), body || title, "update", href || "#inicio"); } catch {}
    }
    const ok = await ensureNotifPermission();
    if (!ok) return;
    try {
      const n = new Notification(title || "OrbyE", {
        body: body || "",
        icon: "assets/orbye-logo.png",
        badge: "assets/orbye-logo.png"
      });
      n.onclick = () => {
        window.focus();
        if (href) location.hash = href.replace(/^#/, "#") || href;
        n.close();
      };
    } catch {}
  };

  // Version / updates notice once per deploy version
  function checkUpdates() {
    try {
      const prev = localStorage.getItem(VER_KEY);
      if (prev !== VER) {
        localStorage.setItem(VER_KEY, VER);
        if (prev) {
          window.orbyeBrowserNotify(
            "OrbyE actualizado",
            "Nueva versión " + VER + " · Proyectos, chat y llamadas mejorados.",
            "#inicio"
          );
        }
      }
    } catch {}
    const tag = document.getElementById("orbyeVersionTag");
    if (tag) tag.textContent = "OrbyE Beta " + VER + " · cloud";
  }

  // Login streak (for future Christmas missions)
  function bumpStreak() {
    const u = getUser();
    if (!u) return;
    const today = new Date().toISOString().slice(0, 10);
    let data = {};
    try { data = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}"); } catch {}
    const mine = data[u] || { days: 0, last: "" };
    if (mine.last === today) return;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    mine.days = mine.last === y ? (mine.days || 0) + 1 : 1;
    mine.last = today;
    data[u] = mine;
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  }
  window.orbyeGetStreak = function() {
    const u = getUser();
    if (!u) return 0;
    try {
      const data = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
      return (data[u] && data[u].days) || 0;
    } catch { return 0; }
  };

  // --- Christmas mode (Dec 1 - Dec 26) ---
  function isChristmasSeason() {
    const d = new Date();
    const m = d.getMonth(); // 0-11
    const day = d.getDate();
    return m === 11 && day >= 1 && day <= 26;
  }
  window.orbyeIsChristmas = isChristmasSeason;

  function applyChristmasHat() {
    if (!isChristmasSeason()) return;
    document.body.classList.add("orbye-xmas");
    // hat overlay on brand logos
    document.querySelectorAll(".brand img, #profileBtnAvatar img, .topbar .brand img").forEach(img => {
      if (img.dataset.xmas) return;
      img.dataset.xmas = "1";
      const wrap = document.createElement("span");
      wrap.className = "xmas-logo-wrap";
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
      const hat = document.createElement("span");
      hat.className = "xmas-hat";
      hat.textContent = "🎅";
      wrap.appendChild(hat);
    });
    // missions panel data
    const box = document.getElementById("xmasMissions");
    if (box) {
      const streak = window.orbyeGetStreak();
      let followers = 0;
      try {
        const g = JSON.parse(localStorage.getItem("orbye_social_v1") || "{}");
        const u = getUser();
        if (u && g[u] && Array.isArray(g[u].followers)) followers = g[u].followers.length;
      } catch {}
      box.innerHTML = `
        <span class="eyebrow">MISIONES DE NAVIDAD</span>
        <h3>🎄 Completa y celebra</h3>
        <ul class="xmas-missions-list">
          <li class="${streak >= 3 ? "done" : ""}">Racha de 3 días en OrbyE (${streak}/3)</li>
          <li class="${followers >= 5 ? "done" : ""}">Tener 5 seguidores o más (${followers}/5)</li>
          <li>Comparte un Veltx con un amigo</li>
        </ul>
        <p class="muted">Solo en temporada navideña. ¡El logo lleva gorrito!</p>
      `;
      box.hidden = false;
    }
  }

  // Call invite notifications to friends
  window.orbyeNotifyFriendsOfCall = function(code) {
    const me = getUser();
    if (!me || !code) return;
    let friends = [];
    try {
      const g = JSON.parse(localStorage.getItem("orbye_social_v1") || "{}");
      if (g[me] && Array.isArray(g[me].friends)) friends = g[me].friends;
    } catch {}
    friends.forEach(f => {
      if (typeof window.orbyeNotify === "function") {
        window.orbyeNotify(f, me + " te invita a una llamada. Código: " + code, "call", "#inicio");
      }
    });
    // Cross-device: store invite in Supabase so other laptops see it
    if (window.orbyeCloud?.enabled && window.orbyeCloud.sendCallInvite) {
      window.orbyeCloud.sendCallInvite({ fromUser: me, code, toUser: "*" }).catch(() => {});
    }
    window.orbyeBrowserNotify("Llamada OrbyE", "Código de sala: " + code, "#inicio");
  };

  // Poll call invites from other devices
  setInterval(async () => {
    const me = getUser();
    if (!me || !window.orbyeCloud?.listCallInvites) return;
    try {
      const inv = await window.orbyeCloud.listCallInvites(me, 10);
      const seenKey = "orbye_seen_call_invites";
      const seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
      inv.forEach(r => {
        if (seen.includes(r.id)) return;
        if (r.author_username === me) return;
        seen.push(r.id);
        const code = r.media_url || (r.body || "").split("|")[1] || "";
        if (typeof window.orbyeNotify === "function") {
          window.orbyeNotify(me, (r.author_username || "Alguien") + " inició una llamada. Código: " + code, "call", "#inicio");
        }
        if (typeof window.orbyeBrowserNotify === "function") {
          window.orbyeBrowserNotify("Llamada OrbyE", (r.author_username || "Alguien") + " · código " + code, "#inicio");
        }
      });
      localStorage.setItem(seenKey, JSON.stringify(seen.slice(-50)));
    } catch (_) {}
  }, 8000);

  // Ask permission once after login
  document.addEventListener("click", () => {
    if (getUser()) ensureNotifPermission();
  }, { once: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      checkUpdates();
      bumpStreak();
      applyChristmasHat();
    });
  } else {
    checkUpdates();
    bumpStreak();
    applyChristmasHat();
  }
})();
