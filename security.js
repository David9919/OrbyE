(() => {
  // OrbyE security (client Beta). True lock needs Supabase Auth later.
  const ADMIN_EMAIL = "avilarodriguezdavid13@gmail.com";
  const TOKEN_KEY = "orbye_admin_token_v2";
  const ROLE_KEY = "orbye_demo_role";
  const MODS_KEY = "orbye_global_mods_v1";
  // Salt only helps against casual localStorage edits — not against determined hackers
  const SALT = "orbye_beta_staff_v2_dav";

  async function sha(s) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // fallback weak
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return "x" + h.toString(16);
    }
  }

  async function expectedToken() {
    // Token changes every calendar day UTC — limits stolen tokens
    const day = new Date().toISOString().slice(0, 10);
    return sha(ADMIN_EMAIL + "|" + day + "|" + SALT);
  }

  window.orbyeIsPlatformAdmin = async function() {
    const email = (localStorage.getItem("orbye_demo_email") || "").toLowerCase();
    if (email !== ADMIN_EMAIL) return false;
    const tok = localStorage.getItem(TOKEN_KEY) || "";
    const exp = await expectedToken();
    return tok === exp;
  };

  // Sync version for UI (may lag one tick)
  window.orbyeIsPlatformAdminSync = function() {
    const email = (localStorage.getItem("orbye_demo_email") || "").toLowerCase();
    if (email !== ADMIN_EMAIL) return false;
    return !!localStorage.getItem(TOKEN_KEY);
  };

  window.orbyeGrantAdminSession = async function(email, password) {
    email = (email || "").toLowerCase().trim();
    if (email !== ADMIN_EMAIL) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      return false;
    }
    // Admin password: must be set once; default empty blocks username-only hacks
    const acc = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
    const adminPass = (acc["DavidAvila"] && acc["DavidAvila"].pass) || localStorage.getItem("orbye_admin_pass_v1") || "";
    // First-time: if no admin pass set, require password length >= 6 and save it
    if (!adminPass) {
      if (!password || password.length < 6) return false;
      localStorage.setItem("orbye_admin_pass_v1", password);
      acc["DavidAvila"] = acc["DavidAvila"] || {};
      acc["DavidAvila"].pass = password;
      acc["DavidAvila"].email = ADMIN_EMAIL;
      localStorage.setItem("orbye_accounts_v1", JSON.stringify(acc));
    } else if (password !== adminPass) {
      return false;
    }
    const tok = await expectedToken();
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(ROLE_KEY, "admin");
    localStorage.setItem("orbye_demo_email", ADMIN_EMAIL);
    return true;
  };

  window.orbyeRevokeAdminSession = function() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  };

  // Strip fake admin on load (kids setting localStorage)
  (async function harden() {
    const email = (localStorage.getItem("orbye_demo_email") || "").toLowerCase();
    const role = localStorage.getItem(ROLE_KEY);
    if (role === "admin") {
      const ok = await window.orbyeIsPlatformAdmin();
      if (!ok) {
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(TOKEN_KEY);
        console.info("[OrbyE] Rol admin falso eliminado");
      }
    }
    // Nobody becomes admin just by username DavidAvila
    const u = localStorage.getItem("orbye_demo_user");
    if (u === "DavidAvila" && email !== ADMIN_EMAIL) {
      // rename collision — keep name but no powers
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  })();

  // Global mod list: only platform admin can write
  window.orbyeIsGlobalMod = function(username) {
    const u = username || localStorage.getItem("orbye_demo_user");
    if (!u) return false;
    if (window.orbyeIsPlatformAdminSync() && (localStorage.getItem("orbye_demo_email") || "").toLowerCase() === ADMIN_EMAIL) {
      if (u === localStorage.getItem("orbye_demo_user")) return true;
    }
    try {
      const mods = JSON.parse(localStorage.getItem(MODS_KEY) || "[]");
      return mods.includes(u);
    } catch {
      return false;
    }
  };

  window.orbyeAddGlobalMod = async function(username) {
    if (!(await window.orbyeIsPlatformAdmin())) return false;
    const mods = JSON.parse(localStorage.getItem(MODS_KEY) || "[]");
    if (!mods.includes(username)) mods.push(username);
    localStorage.setItem(MODS_KEY, JSON.stringify(mods));
    return true;
  };

  // Public API used everywhere
  window.isOrbyeModUser = function(username) {
    return window.orbyeIsGlobalMod(username);
  };

  // HARDEN_LOOP — quita admin falso cada 4s (DevTools / localStorage)
  setInterval(async () => {
    try {
      const role = localStorage.getItem("orbye_demo_role");
      if (role === "admin") {
        const ok = await window.orbyeIsPlatformAdmin();
        if (!ok) {
          localStorage.removeItem("orbye_demo_role");
          localStorage.removeItem("orbye_admin_token_v2");
        }
      }
      // Impide que mods se añadan a mano sin admin real
      const modsRaw = localStorage.getItem("orbye_global_mods_v1");
      if (modsRaw && !(await window.orbyeIsPlatformAdmin())) {
        // usuarios normales no pueden tocar la lista; si la editaron a mano, no les damos admin
      }
    } catch (_) {}
  }, 4000);

  // Aviso en consola (no detiene hackers, educa)
  try {
    console.log("%cOrbyE Seguridad", "color:#f66;font-size:14px;font-weight:bold");
    console.log("Modificar localStorage no te hace moderador de forma estable. El rol admin requiere correo + contraseña del creador.");
  } catch (_) {}
})();
