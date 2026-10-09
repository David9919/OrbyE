(() => {
  const STREAK = "orbye_haker_progress_v1";
  const REWARDS = "orbye_haker_rewards_v1";

  function getUser() { return localStorage.getItem("orbye_demo_user"); }

  function progress() {
    const u = getUser() || "anon";
    let all = {};
    try { all = JSON.parse(localStorage.getItem(STREAK) || "{}"); } catch {}
    if (!all[u]) all[u] = { followers: 0, likes: 0, posts: 0, claims: [], reports: 0 };
    try {
      const fol = JSON.parse(localStorage.getItem("orbye_follows_v1") || "{}");
      const mine = Object.keys(fol).filter(k => (fol[k] || []).includes(u));
      all[u].followers = Math.max(all[u].followers || 0, mine.length);
    } catch {}
    try {
      const stats = JSON.parse(localStorage.getItem("orbye_veltx_stats_v1") || "{}");
      let likes = 0;
      Object.values(stats).forEach(s => {
        if (s && Array.isArray(s.uniqueLikers)) likes += s.uniqueLikers.length;
        else if (s && s.likes) likes += Number(s.likes) || 0;
      });
      all[u].likes = Math.max(all[u].likes || 0, likes);
    } catch {}
    try {
      const posts = JSON.parse(localStorage.getItem("orbye_posts_v1") || "[]");
      all[u].posts = posts.filter(p => p.user === u || p.author === u).length;
    } catch {}
    return all[u];
  }

  function saveProgress(p) {
    const u = getUser() || "anon";
    let all = {};
    try { all = JSON.parse(localStorage.getItem(STREAK) || "{}"); } catch {}
    all[u] = p;
    localStorage.setItem(STREAK, JSON.stringify(all));
  }

  const MISSIONS = [
    { id: "f1", title: "Consigue 1 seguidor", need: 1, type: "followers", reward: "Gorra HAKER roja", xp: 10 },
    { id: "f3", title: "Consigue 3 seguidores", need: 3, type: "followers", reward: "Antifaz digital", xp: 25 },
    { id: "f5", title: "Consigue 5 seguidores", need: 5, type: "followers", reward: "Chaqueta neon HAKER", xp: 50 },
    { id: "f10", title: "Consigue 10 seguidores", need: 10, type: "followers", reward: "Capa sombra roja", xp: 100 },
    { id: "l5", title: "Recibe 5 likes en Veltx", need: 5, type: "likes", reward: "Insignia 3D bug", xp: 15 },
    { id: "l15", title: "Recibe 15 likes en Veltx", need: 15, type: "likes", reward: "Aura roja avatar", xp: 40 },
    { id: "l30", title: "Recibe 30 likes en Veltx", need: 30, type: "likes", reward: "Modelo accesorio: dron", xp: 80 },
    { id: "p1", title: "Publica 1 post en Spaces", need: 1, type: "posts", reward: "Sticker HAKER", xp: 10 },
    { id: "p3", title: "Publica 3 posts", need: 3, type: "posts", reward: "Marco perfil rojo", xp: 30 },
    { id: "login", title: "Entra 3 días (racha)", need: 3, type: "streak", reward: "Botas cyber", xp: 35 }
  ];

  function streakDays() {
    try {
      const data = JSON.parse(localStorage.getItem("orbye_login_streak_v1") || "{}");
      const u = getUser();
      return (data[u] && data[u].days) || 0;
    } catch { return 0; }
  }

  function valFor(m, pr) {
    if (m.type === "followers") return pr.followers || 0;
    if (m.type === "likes") return pr.likes || 0;
    if (m.type === "posts") return pr.posts || 0;
    if (m.type === "streak") return streakDays();
    return 0;
  }

  function openPanel() {
    let p = document.getElementById("hakerEventPanel");
    if (!p) {
      p = document.createElement("div");
      p.id = "hakerEventPanel";
      p.innerHTML = `
        <div class="haker-panel-box">
          <div class="haker-head">
            <span class="haker-badge">EVENTO</span>
            <h2>HAKER</h2>
            <button type="button" id="hakerPanelClose" aria-label="Cerrar">×</button>
          </div>
          <p class="haker-intro">Evento de temporada: misiones de <b>seguidores</b>, <b>likes</b> y <b>posts</b>. Recompensas: <b>accesorios 3D</b> para tu avatar.</p>
          <div id="hakerStats" class="haker-stats"></div>
          <div class="haker-tabs">
            <button type="button" class="haker-tab active" data-tab="misiones">Misiones</button>
            <button type="button" class="haker-tab" data-tab="inventario">Inventario</button>
            <button type="button" class="haker-tab" data-tab="info">Info</button>
          </div>
          <div id="hakerMissions"></div>
          <div id="hakerInventory" hidden></div>
          <div id="hakerInfo" hidden></div>
          <p class="haker-foot">Juego limpio · Reporta bugs al Staff · No ataques reales</p>
        </div>`;
      p.style.cssText = "position:fixed;inset:0;z-index:999995;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px";
      const st = document.createElement("style");
      st.textContent = `
        .haker-panel-box{max-width:520px;width:94%;max-height:90vh;overflow:auto;background:#120808;border:2px solid #e11;border-radius:16px;padding:18px;color:#fcc}
        .haker-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .haker-head h2{margin:0;color:#fff;font-size:22px}
        .haker-badge{background:#e11;color:#fff;font-weight:800;font-size:11px;padding:3px 8px;border-radius:4px}
        #hakerPanelClose{margin-left:auto;background:transparent;border:0;color:#f88;font-size:22px;cursor:pointer}
        .haker-intro{margin:0 0 14px;opacity:.9;font-size:13px}
        .haker-stats{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
        .haker-stats > div{flex:1;min-width:70px;background:#1a0a0a;border-radius:10px;padding:10px;text-align:center}
        .haker-stats .n{font-size:22px;color:#fff}
        .haker-tabs{display:flex;gap:8px;margin-bottom:12px}
        .haker-tab{flex:1;padding:8px;border:1px solid #533;background:#1a0a0a;color:#fcc;border-radius:8px;cursor:pointer;font-size:12px}
        .haker-tab.active{background:#e11;color:#fff;border-color:#e11}
        .haker-foot{margin:14px 0 0;font-size:11px;opacity:.7}
        .haker-m{background:#1a0a0a;border:1px solid #333;border-radius:12px;padding:12px;margin-bottom:8px}
        .haker-m.done{border-color:#e11}
        .haker-bar{height:6px;background:#333;border-radius:4px;margin:8px 0;overflow:hidden}
        .haker-bar > i{display:block;height:100%;background:#e11}
        .haker-claim{margin-top:8px;padding:6px 12px;border-radius:8px;border:0;cursor:pointer;background:#442;color:#fff;font-size:12px}
        .haker-claim.ready{background:#e11}
        .haker-claim:disabled{opacity:.7;cursor:default}
      `;
      document.head.appendChild(st);
      document.body.appendChild(p);
      document.getElementById("hakerPanelClose")?.addEventListener("click", () => { p.style.display = "none"; });
      p.addEventListener("click", e => { if (e.target === p) p.style.display = "none"; });
      p.querySelectorAll(".haker-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          p.querySelectorAll(".haker-tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          const t = tab.getAttribute("data-tab");
          document.getElementById("hakerMissions").hidden = t !== "misiones";
          document.getElementById("hakerInventory").hidden = t !== "inventario";
          document.getElementById("hakerInfo").hidden = t !== "info";
          if (t === "inventario") renderInv();
          if (t === "info") renderInfo();
        });
      });
    }
    p.style.display = "flex";
    renderMissions();
  }

  function renderMissions() {
    const pr = progress();
    const stats = document.getElementById("hakerStats");
    if (stats) {
      const xp = (pr.claims || []).reduce((a, id) => {
        const m = MISSIONS.find(x => x.id === id);
        return a + (m && m.xp || 0);
      }, 0);
      stats.innerHTML = `
        <div><div class="n">${pr.followers||0}</div><div style="font-size:11px">Seguidores</div></div>
        <div><div class="n">${pr.likes||0}</div><div style="font-size:11px">Likes</div></div>
        <div><div class="n">${pr.posts||0}</div><div style="font-size:11px">Posts</div></div>
        <div><div class="n">${xp}</div><div style="font-size:11px">XP HAKER</div></div>`;
    }
    const box = document.getElementById("hakerMissions");
    if (!box) return;
    box.innerHTML = MISSIONS.map(m => {
      const val = valFor(m, pr);
      const done = val >= m.need;
      const claimed = (pr.claims || []).includes(m.id);
      const pct = Math.min(100, Math.round((val / m.need) * 100));
      return `<div class="haker-m${done ? " done" : ""}">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <strong style="color:#fff;font-size:14px">${m.title}</strong>
          <span style="font-size:12px">${val}/${m.need}</span>
        </div>
        <div class="haker-bar"><i style="width:${pct}%"></i></div>
        <div style="font-size:12px;opacity:.85">🎁 ${m.reward} · ${m.xp} XP</div>
        <button type="button" class="haker-claim${done && !claimed ? " ready" : ""}" data-mid="${m.id}" ${(!done || claimed) ? "disabled" : ""}>
          ${claimed ? "Reclamado ✓" : done ? "Reclamar accesorio" : "En progreso"}
        </button>
      </div>`;
    }).join("");
    box.querySelectorAll(".haker-claim").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-mid");
        const pr2 = progress();
        if (!(pr2.claims || []).includes(id)) {
          pr2.claims = pr2.claims || [];
          pr2.claims.push(id);
          saveProgress(pr2);
          const m = MISSIONS.find(x => x.id === id);
          try {
            const rw = JSON.parse(localStorage.getItem(REWARDS) || "[]");
            rw.push({ id, reward: m && m.reward, ts: Date.now(), user: getUser() });
            localStorage.setItem(REWARDS, JSON.stringify(rw));
          } catch {}
          alert("¡Recompensa HAKER!\n" + (m && m.reward));
        }
        renderMissions();
      });
    });
  }

  function renderInv() {
    const el = document.getElementById("hakerInventory");
    if (!el) return;
    let rw = [];
    try { rw = JSON.parse(localStorage.getItem(REWARDS) || "[]"); } catch {}
    const u = getUser();
    rw = rw.filter(r => !r.user || r.user === u);
    if (!rw.length) {
      el.innerHTML = "<p style='opacity:.8;font-size:13px'>Aún no tienes accesorios. Completa misiones y reclama.</p>";
      return;
    }
    el.innerHTML = rw.map(r => `<div class="haker-m done"><strong style="color:#fff">${r.reward}</strong><div style="font-size:11px;opacity:.7">${new Date(r.ts).toLocaleString()}</div></div>`).join("");
  }

  function renderInfo() {
    const el = document.getElementById("hakerInfo");
    if (!el) return;
    el.innerHTML = `
      <div class="haker-m">
        <strong style="color:#fff">¿Qué es HAKER?</strong>
        <p style="font-size:13px;margin:8px 0 0;opacity:.9">Evento especial de OrbyE para probar la seguridad y crecer la comunidad. Gana accesorios 3D completando misiones sociales.</p>
      </div>
      <div class="haker-m">
        <strong style="color:#fff">Reglas</strong>
        <ul style="font-size:13px;margin:8px 0 0;padding-left:18px;opacity:.9">
          <li>No ataques reales ni spam</li>
          <li>Reporta bugs al Staff Team</li>
          <li>Las recompensas son cosméticas (avatar / 3D)</li>
        </ul>
      </div>`;
  }

  window.orbyeOpenHakerEvent = openPanel;

  function wireBar() {
    const bar = document.getElementById("hakerEventBar");
    if (!bar || bar.dataset.hakerWired) return;
    bar.dataset.hakerWired = "1";
    bar.style.cursor = "pointer";
    bar.addEventListener("click", e => {
      if (e.target && (e.target.id === "hakerX" || e.target.closest("#hakerX"))) return;
      openPanel();
    });
  }
  const obs = setInterval(() => { wireBar(); if (document.getElementById("hakerEventBar")?.dataset.hakerWired) clearInterval(obs); }, 400);
  setTimeout(() => clearInterval(obs), 20000);
})();
