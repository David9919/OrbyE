(() => {
  const ACC = "orbye_accounts_v1";
  const ADMIN_EMAIL = "avilarodriguezdavid13@gmail.com";

  function load() { try { return JSON.parse(localStorage.getItem(ACC) || "{}"); } catch { return {}; } }
  function save(o) { localStorage.setItem(ACC, JSON.stringify(o)); }

  document.getElementById("togglePassVis")?.addEventListener("click", () => {
    const i = document.getElementById("accountPassword");
    if (!i) return;
    i.type = i.type === "password" ? "text" : "password";
  });

  document.getElementById("openChangePass")?.addEventListener("click", () => {
    const p = document.getElementById("changePasswordPanel");
    if (p) { p.hidden = false; p.style.display = "flex"; }
  });
  document.getElementById("closeChangePass")?.addEventListener("click", () => {
    const p = document.getElementById("changePasswordPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
  });

  document.getElementById("passChangeBtn")?.addEventListener("click", async () => {
    const msg = document.getElementById("passChangeMsg");
    const u = localStorage.getItem("orbye_demo_user");
    const email = (localStorage.getItem("orbye_demo_email") || "").toLowerCase();
    if (!u) { if (msg) msg.textContent = "Inicia sesión primero"; return; }

    const oldP = document.getElementById("passOld")?.value || "";
    const n1 = document.getElementById("passNew")?.value || "";
    const n2 = document.getElementById("passNew2")?.value || "";

    if (n1.length < 6) { if (msg) msg.textContent = "La nueva contraseña: mínimo 6 caracteres"; return; }
    if (n1 !== n2) { if (msg) msg.textContent = "Las nuevas no coinciden"; return; }

    const acc = load();
    const key = email === ADMIN_EMAIL ? "DavidAvila" : u;
    const row = acc[key] || acc[u] || {};
    const current =
      row.pass ||
      localStorage.getItem("orbye_admin_pass_v1") ||
      "";

    // If a password exists, must match old
    if (current && oldP !== current) {
      if (msg) msg.textContent = "Contraseña actual incorrecta";
      return;
    }
    // If no password yet, allow set without old (first time)
    row.pass = n1;
    row.email = email || row.email || "";
    acc[key] = row;
    if (key !== u) acc[u] = row;
    save(acc);
    if (email === ADMIN_EMAIL) {
      localStorage.setItem("orbye_admin_pass_v1", n1);
      if (typeof window.orbyeGrantAdminSession === "function") {
        await window.orbyeGrantAdminSession(email, n1);
      }
    }
    if (msg) {
      msg.textContent = "Contraseña guardada. Úsala al iniciar sesión.";
      msg.style.color = "#6dce8a";
    }
    ["passOld", "passNew", "passNew2"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  });
})();
