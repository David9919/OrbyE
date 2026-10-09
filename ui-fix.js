(() => {
  function openLogin() {
    const p = document.getElementById("accountPanel");
    if (p) {
      p.hidden = false;
      p.style.display = "flex";
    }
  }
  function openMyProfile() {
    const user = localStorage.getItem("orbye_demo_user");
    if (!user) {
      openLogin();
      return;
    }
    // Prefer dedicated open
    const panel = document.getElementById("profilePanel");
    if (panel) {
      panel.hidden = false;
      panel.style.display = "flex";
    }
    // Trigger existing render if available
    try {
      document.getElementById("profileButton")?.dispatchEvent(new Event("click"));
    } catch (e) {}
    // If still using public for self:
    if (typeof window.orbyeOpenProfile === "function") {
      // open own edit panel is better
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("#loginButton")) {
      e.preventDefault();
      e.stopPropagation();
      openLogin();
      return;
    }
    if (e.target.closest("#profileButton")) {
      e.preventDefault();
      e.stopPropagation();
      const user = localStorage.getItem("orbye_demo_user");
      if (!user) {
        openLogin();
        return;
      }
      const panel = document.getElementById("profilePanel");
      if (panel) {
        panel.hidden = false;
        panel.style.display = "flex";
      }
      // Call profile render via custom event
      window.dispatchEvent(new CustomEvent("orbye-open-my-profile"));
      return;
    }
    // Video / post author -> profile
    const hit = e.target.closest(".user-hit, .ot-by-btn, [data-user]");
    if (hit && hit.dataset && hit.dataset.user) {
      // don't steal buttons that are not user links
      if (hit.closest("button.ot-like-btn, button.ot-start-btn")) return;
      if (typeof window.orbyeOpenProfile === "function") {
        window.orbyeOpenProfile(hit.dataset.user);
      }
    }
  }, true);

  // close panels
  document.addEventListener("click", function (e) {
    if (e.target.id === "closeAccount" || e.target.id === "closeProfile" || e.target.id === "closePublicProfile") {
      const map = {
        closeAccount: "accountPanel",
        closeProfile: "profilePanel",
        closePublicProfile: "publicProfilePanel"
      };
      const id = map[e.target.id];
      const p = document.getElementById(id);
      if (p) {
        p.hidden = true;
        p.style.display = "none";
      }
    }
  });

  // Keep profile button visible when logged in
  function syncBtns() {
    const user = localStorage.getItem("orbye_demo_user");
    const pb = document.getElementById("profileButton");
    if (pb) {
      pb.hidden = !user;
      pb.style.display = user ? "" : "none";
    }
  }
  window.addEventListener("orbye-login", syncBtns);
  syncBtns();

  window.addEventListener("orbye-open-my-profile", function () {
    // profile.js listens? also force render fields
    const user = localStorage.getItem("orbye_demo_user");
    if (!user) return;
    const panel = document.getElementById("profilePanel");
    if (panel) {
      panel.hidden = false;
      panel.style.display = "flex";
    }
  });
})();

// DMCA form — notificaciones reales al admin
(() => {
  const form = document.getElementById("dmcaForm");
  if (!form) return;

  function toast(msg, type) {
    if (typeof window.showToast === "function") window.showToast(msg, type || "ok");
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("dmcaName")?.value?.trim();
    const email = document.getElementById("dmcaEmail")?.value?.trim();
    const url = document.getElementById("dmcaUrl")?.value?.trim();
    const desc = document.getElementById("dmcaDesc")?.value?.trim();
    const sign = document.getElementById("dmcaSign")?.value?.trim();
    const swear = document.getElementById("dmcaSwear")?.checked;
    const msg = document.getElementById("dmcaMsg");
    const file = document.getElementById("dmcaFile")?.files?.[0];
    if (!name || !email || !url || !desc || !sign || !swear) {
      if (msg) msg.textContent = "Completa todos los campos obligatorios.";
      toast("Completa el formulario DMCA", "warn");
      return;
    }
    let docMeta = null;
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        if (msg) msg.textContent = "Documento máx. 4 MB.";
        return;
      }
      docMeta = await new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve({ name: file.name, type: file.type, data: r.result });
        r.onerror = () => resolve({ name: file.name, type: file.type, data: null });
        r.readAsDataURL(file);
      });
    }
    const notice = {
      id: crypto.randomUUID(),
      name, email, url, desc, sign,
      ts: Date.now(),
      status: "pending",
      document: docMeta
    };
    const key = "orbye_dmca_notices_v1";
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
    list.unshift(notice);
    if (list.length > 30) list.length = 30;
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      notice.document = docMeta ? { name: docMeta.name, type: docMeta.type, data: null } : null;
      list[0] = notice;
      localStorage.setItem(key, JSON.stringify(list));
    }

    const targets = new Set(["DavidAvila"]);
    try {
      const accounts = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
      Object.keys(accounts).forEach(k => {
        if (accounts[k] && accounts[k].role === "admin") targets.add(k);
      });
    } catch {}
    const text = "DMCA de " + name + ": " + (url || "").slice(0, 80);
    targets.forEach(u => {
      if (typeof window.orbyeNotify === "function") {
        window.orbyeNotify(u, text, "dmca", "#dmca");
      }
    });
    const me = localStorage.getItem("orbye_demo_user");
    if (me && !targets.has(me) && typeof window.orbyeNotify === "function") {
      window.orbyeNotify(me, "Tu aviso DMCA fue enviado (ref " + notice.id.slice(0, 8) + ")", "dmca", "#dmca");
    }

    if (msg) {
      msg.textContent = "Aviso guardado. Revisa la campana (ref " + notice.id.slice(0, 8) + ").";
      msg.style.color = "#6dce8a";
    }
    toast("DMCA enviado — mira la campana", "ok");
    form.reset();
    window.dispatchEvent(new CustomEvent("orbye-login"));
  });
})();
