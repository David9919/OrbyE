(() => {
  const input = document.getElementById("siteSearch");
  const result = document.getElementById("searchResult");
  const dropdown = document.getElementById("searchDropdown");
  const accountPanel = document.getElementById("accountPanel");
  const loginBtn = document.getElementById("loginButton");
  const wall = document.getElementById("wallpassInfo");

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function match(text, q) {
    return String(text || "").toLowerCase().includes(q);
  }

  function goHref(href) {
    if (!href) return;
    if (!href.startsWith("#")) href = "#" + href;
    location.hash = href;
    const el = document.getElementById(href.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function runSearch() {
    if (!input) return;
    const q = (input.value || "").trim().toLowerCase();
    if (dropdown) {
      dropdown.classList.remove("open");
      dropdown.innerHTML = "";
      dropdown._hits = [];
    }
    if (!q) {
      if (result) { result.hidden = true; result.textContent = ""; }
      return;
    }

    const hits = [];

    // Secciones fijas
    const shortcuts = [
      { keys: ["inicio", "home", "destacado"], title: "🏠 Inicio", href: "#inicio" },
      { keys: ["noticia", "news"], title: "📰 Noticias", href: "#noticias" },
      { keys: ["veltx", "video", "orbytube", "tube"], title: "▶ Veltx — videos", href: "#orbytube" },
      { keys: ["space", "comunidad", "community"], title: "⬡ Spaces", href: "#comunidad" },
      { keys: ["wallpass", "pase", "membres"], title: "WallPass", href: "#wallpass" },
      { keys: ["staff", "bug", "moder"], title: "🛡 Staff Team", href: "#inicio" },
      { keys: ["legal", "privacidad", "termino"], title: "Políticas OrbyE", href: "#legal" }
    ];
    shortcuts.forEach(s => {
      if (s.keys.some(k => k.includes(q) || q.includes(k) || match(k, q))) {
        hits.push({ title: s.title, href: s.href, type: "section" });
      }
    });

    // Spaces del usuario
    try {
      const spaces = JSON.parse(localStorage.getItem("orbye_spaces_v2") || "{}");
      Object.values(spaces).forEach(s => {
        if (match(s.name, q) || match(s.desc, q) || match(s.about, q)) {
          hits.push({ title: "Space: " + s.name, href: "#comunidad", type: "space", spaceId: s.id });
        }
      });
    } catch (_) {}

    // Videos Veltx
    try {
      const vids = JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || "[]");
      vids.forEach(v => {
        if (match(v.title, q) || match(v.desc, q) || match(v.uploader, q) || (v.tags || []).some(t => match(t, q))) {
          hits.push({ title: "Video: " + (v.title || "sin título"), href: "#orbytube", type: "video", id: v.id });
        }
      });
    } catch (_) {}

    // Posts
    try {
      const all = JSON.parse(localStorage.getItem("orbye_space_posts_v2") || "{}");
      Object.values(all).forEach(list => {
        (list || []).forEach(p => {
          if (match(p.text, q) || match(p.user, q)) {
            hits.push({ title: "📝 Post: " + (p.text || "").slice(0, 60), href: "#comunidad", type: "post" });
          }
        });
      });
    } catch (_) {}

    // News
    try {
      const news = JSON.parse(localStorage.getItem("orbye_news_v1") || "[]");
      news.forEach(n => {
        if (match(n.title, q) || match(n.body, q)) {
          hits.push({ title: "📰 Noticia: " + n.title, href: "#noticias", type: "news" });
        }
      });
    } catch (_) {}

    // Usuarios (perfiles)
    try {
      const profiles = JSON.parse(localStorage.getItem("orbye_user_profiles_v1") || "{}");
      Object.keys(profiles).forEach(u => {
        const p = profiles[u] || {};
        if (match(u, q) || match(p.displayName, q) || match(p.username, q) || match(p.bio, q)) {
          hits.push({ title: "Usuario: " + (p.displayName || u), type: "user", user: u });
        }
      });
    } catch (_) {}

    // dedupe by title
    const seen = new Set();
    const unique = [];
    hits.forEach(h => {
      const k = h.title + "|" + (h.href || "") + "|" + (h.id || "") + "|" + (h.user || "");
      if (!seen.has(k)) { seen.add(k); unique.push(h); }
    });

    if (result) {
      result.hidden = false;
      result.textContent = unique.length ? (unique.length + " resultado(s)") : "Sin resultados";
    }
    if (dropdown) {
      if (!unique.length) {
        dropdown.innerHTML = "<button type='button' disabled>Sin resultados para \"" + esc(q) + "\"</button>";
      } else {
        dropdown.innerHTML = unique.slice(0, 14).map((h, i) =>
          "<button type=\"button\" data-hit=\"" + i + "\">" + esc(h.title) + "</button>"
        ).join("");
      }
      dropdown._hits = unique;
      dropdown.classList.add("open");
    }
  }

  function bindSearch() {
    if (!input) {
      console.warn("[OrbyE] No se encontró #siteSearch");
      return;
    }
    input.addEventListener("input", runSearch);
    input.addEventListener("focus", () => {
      if ((input.value || "").trim()) runSearch();
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch();
        const hits = dropdown?._hits || [];
        if (!hits.length) return;
        const h = hits[0];
        if (h.type === "video" && h.id && typeof window.orbyeSelectVideo === "function") {
          goHref("#orbytube");
          window.orbyeSelectVideo(h.id);
        } else if (h.type === "user" && h.user && typeof window.orbyeOpenProfile === "function") {
          window.orbyeOpenProfile(h.user);
        } else if (h.href) {
          goHref(h.href);
        }
        if (dropdown) dropdown.classList.remove("open");
      }
      if (e.key === "Escape" && dropdown) dropdown.classList.remove("open");
    });
    dropdown?.addEventListener("click", e => {
      const btn = e.target.closest("[data-hit]");
      if (!btn || !dropdown._hits) return;
      const h = dropdown._hits[Number(btn.dataset.hit)];
      if (!h) return;
      if (h.type === "video" && h.id && typeof window.orbyeSelectVideo === "function") {
        goHref("#orbytube");
        setTimeout(() => window.orbyeSelectVideo(h.id), 150);
      } else if (h.type === "user" && h.user && typeof window.orbyeOpenProfile === "function") {
        window.orbyeOpenProfile(h.user);
      } else if (h.href) {
        goHref(h.href);
      }
      dropdown.classList.remove("open");
      input.blur();
    });
    document.addEventListener("click", e => {
      if (dropdown && !e.target.closest(".search-wrap")) dropdown.classList.remove("open");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSearch);
  } else {
    bindSearch();
  }

function refreshLoginButton() {
    const user = localStorage.getItem("orbye_demo_user");
    const pb = document.getElementById("profileButton");
    if (pb) pb.hidden = !user;
    const nb = document.getElementById("notifBtn");
    if (nb) nb.hidden = !user;
    if (loginBtn) {
      if (user) {
        const admin = localStorage.getItem("orbye_demo_role") === "admin";
        loginBtn.textContent = admin ? user + " · Admin" : user;
        loginBtn.classList.add("logged");
        if (admin) loginBtn.classList.add("admin-user");
        else loginBtn.classList.remove("admin-user");
      } else {
        loginBtn.textContent = "Iniciar sesión";
        loginBtn.classList.remove("logged");
        loginBtn.classList.remove("admin-user");
      }
    }
    refreshMembershipBadge();
  }

  function openAccount() {
    if (accountPanel) {
      accountPanel.hidden = false;
      const email = document.getElementById("accountEmail");
      if (email) setTimeout(() => email.focus(), 50);
    }
  }

  loginBtn?.addEventListener("click", openAccount);
  // FIX_LOGIN_PROFILE: also capture clicks if something overlays
  document.addEventListener("click", function(e) {
    const t = e.target.closest("#loginButton");
    if (t) { e.preventDefault(); openAccount(); }
  }, true);
  document.getElementById("vdLoginBtn")?.addEventListener("click", openAccount);

  document.getElementById("closeAccount")?.addEventListener("click", e => {
    e.preventDefault();
    if (accountPanel) accountPanel.hidden = true;
  });

  accountPanel?.addEventListener("click", e => {
    if (e.target === accountPanel) accountPanel.hidden = true;
  });

  // Login / Crear cuenta (demo local — funciona en Netlify)
  document.getElementById("accountSubmit")?.addEventListener("click", () => {
    const emailEl = document.getElementById("accountEmail");
    const passEl = document.getElementById("accountPassword");
    const msg = document.getElementById("accountMessage");
    const email = (emailEl?.value || "").trim();
    const pass = (passEl?.value || "").trim();

    if (!email) {
      if (msg) { msg.textContent = "Escribe un correo o nombre de usuario."; msg.style.color = "#f88"; }
      return;
    }
    // Identity: one canonical username (no clones)
    let nick = email.includes("@") ? email.split("@")[0] : email;
    nick = nick.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "Usuario";
    const low = nick.toLowerCase();
    const ADMIN_EMAIL = "avilarodriguezdavid13@gmail.com";
    // Only real admin email gets the DavidAvila staff identity
    let isAdmin = false;
    if (email.toLowerCase() === ADMIN_EMAIL) {
      nick = "DavidAvila";
      // Require password — no username-only admin
      if (typeof window.orbyeGrantAdminSession === "function") {
        window.orbyeGrantAdminSession(email, pass).then(ok => {
          isAdmin = ok;
          if (!ok && msg) {
            msg.textContent = "Admin: contraseña incorrecta o muy corta (mín. 6).";
            msg.style.color = "#f88";
          }
        });
      }
      localStorage.setItem("orbye_demo_email", ADMIN_EMAIL);
    } else {
      // Claiming "DavidAvila" without admin email → allowed as normal user name, NO powers
      localStorage.removeItem("orbye_demo_role");
      localStorage.removeItem("orbye_admin_token_v2");
      if ((localStorage.getItem("orbye_demo_email") || "").toLowerCase() === ADMIN_EMAIL) {
        localStorage.removeItem("orbye_demo_email");
      }
    }

    const langSel = document.getElementById("accountLang");
    if (langSel && langSel.value) {
      localStorage.setItem("orbye_lang", langSel.value);
      if (typeof window.orbyeSetLang === "function") window.orbyeSetLang(langSel.value);
    }
    // PASS_CHECK_LOGIN
    try {
      const accounts = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
      const row = accounts[nick] || accounts[email] || {};
      const need = row.pass || (email.toLowerCase() === "avilarodriguezdavid13@gmail.com" ? localStorage.getItem("orbye_admin_pass_v1") : "");
      if (need && pass !== need) {
        if (msg) { msg.textContent = "Contraseña incorrecta"; msg.style.color = "#f88"; }
        return;
      }
    } catch (_) {}
    localStorage.setItem("orbye_demo_user", nick);
    try { window.dispatchEvent(new CustomEvent("orbye-login-ok")); } catch(_){}
    try { if (window.orbyeRequireLoginGate) window.orbyeRequireLoginGate(); } catch(_){}
    const birth = document.getElementById("accountBirth")?.value;
    if (birth && typeof window.orbyeSaveBirthDate === "function") {
      const ok = window.orbyeSaveBirthDate(birth);
      if (!ok) {
        if (msg) { msg.textContent = "Fecha de nacimiento no válida."; msg.style.color = "#f88"; }
        return;
      }
    }
    if (pass) localStorage.setItem("orbye_demo_pass_hint", "1");

    // Registro simple de cuentas locales
    try {
      const accounts = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
      if (!accounts[nick]) {
        accounts[nick] = { email: email, created: Date.now(), role: isAdmin ? "admin" : "user" };
        localStorage.setItem("orbye_accounts_v1", JSON.stringify(accounts));
      } else if (isAdmin) {
        accounts[nick].role = "admin";
        accounts[nick].email = ADMIN_EMAIL;
        localStorage.setItem("orbye_accounts_v1", JSON.stringify(accounts));
      }
    } catch (_) {}

    if (msg) {
      msg.textContent = isAdmin
        ? "Bienvenido, DavidAvila — Administrador y creador de OrbyE."
        : ("Listo. Sesión como " + nick + ". Ya puedes publicar y subir videos.");
      msg.style.color = "#6dce8a";
    }
    refreshLoginButton();
    try {
      const b = document.getElementById("vdLoginBtn");
      const u = localStorage.getItem("orbye_demo_user");
      if (b) { b.hidden = !!u; b.style.display = u ? "none" : ""; }
    } catch(_) {}
    window.dispatchEvent(new CustomEvent("orbye-login", { detail: { user: nick } }));
    // Force single cloud profile (destroy local clone of other nick variants)
    (async () => {
      try {
        if (window.orbyeCloud?.enabled && window.orbyePullCloudProfile) {
          await window.orbyePullCloudProfile(nick);
        }
        // Clean clone keys that are case-variants of same user
        const keys = ["orbye_profiles_v1", "orbye_user_profiles_v1"];
        keys.forEach(k => {
          try {
            const all = JSON.parse(localStorage.getItem(k) || "{}");
            Object.keys(all).forEach(name => {
              if (name.toLowerCase() === nick.toLowerCase() && name !== nick) {
                // merge into canonical then delete clone
                all[nick] = Object.assign({}, all[name], all[nick] || {});
                delete all[name];
              }
            });
            localStorage.setItem(k, JSON.stringify(all));
          } catch (_) {}
        });
        if (window.orbyePushCloudProfile) await window.orbyePushCloudProfile(nick);
      } catch (err) { console.warn(err); }
    })();
    setTimeout(() => {
      if (accountPanel) accountPanel.hidden = true;
    }, 700);
  });

  // Enter key on password/email submits
  ["accountEmail", "accountPassword"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", e => {
      if (e.key === "Enter") document.getElementById("accountSubmit")?.click();
    });
  });

  document.getElementById("guideButton")?.addEventListener("click", () => {
    const gmsg = document.getElementById("guideMessage");
    if (gmsg) {
      gmsg.hidden = false;
      gmsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  // WallPass
  function wallTier() {
    return localStorage.getItem("orbye_wallpass_tier") || "";
  }

  function refreshMembershipBadge() {
    const badge = document.getElementById("userBadge");
    const tier = wallTier();
    const show = localStorage.getItem("orbye_wp_opt_badge") !== "0";
    if (!badge) return;
    if (!tier || !show) {
      badge.hidden = true;
      badge.textContent = "";
      badge.className = "user-membership-badge";
      return;
    }
    badge.hidden = false;
    badge.className = "user-membership-badge " + tier;
    badge.textContent = tier === "ultimate" ? "◆ Ultimate" : "★ Premium";
    badge.title = "WallPass " + (tier === "ultimate" ? "Ultimate" : "Premium");
  }

  function computeUserAnalytics() {
    let posts = 0, views = 0, likes = 0, videos = 0, vidViews = 0;
    const user = localStorage.getItem("orbye_demo_user");
    try {
      const all = JSON.parse(localStorage.getItem("orbye_space_posts_v2") || "{}");
      Object.values(all).forEach(list => {
        (list || []).forEach(p => {
          if (user && p.user === user) {
            posts++;
            views += p.views || 0;
            likes += p.likes || 0;
          }
        });
      });
    } catch (_) {}
    try {
      const vids = JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || "[]");
      const stats = JSON.parse(localStorage.getItem("orbye_orbytube_stats_v2") || "{}");
      vids.forEach(v => {
        if (user && v.uploader === user) {
          videos++;
          vidViews += (stats[v.id] || {}).views || 0;
        }
      });
    } catch (_) {}
    const score = views + likes * 4 + vidViews;
    return { posts, views, likes, videos, vidViews, score };
  }

  function refreshWallpassPanel() {
    const tier = wallTier();
    const cur = document.getElementById("wpCurrentBadge");
    const an = document.getElementById("wpAnalytics");
    if (cur) {
      if (tier) {
        cur.hidden = false;
        cur.innerHTML = tier === "ultimate"
          ? '<span class="wp-badge ultimate">TU PLAN: ULTIMATE</span> Membresía activa'
          : '<span class="wp-badge premium">TU PLAN: PREMIUM</span> Membresía activa';
      } else {
        cur.hidden = true;
      }
    }
    if (an) {
      an.hidden = !tier;
      if (tier) {
        const a = computeUserAnalytics();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
        set("wpAnPosts", a.posts);
        set("wpAnViews", a.views);
        set("wpAnLikes", a.likes);
        set("wpAnVideos", a.videos);
        set("wpAnVidViews", a.vidViews);
        set("wpAnScore", a.score);
      }
    }
    refreshMembershipBadge();
  }

  document.getElementById("wallpassButton")?.addEventListener("click", () => {
    if (wall) wall.hidden = false;
    setTimeout(refreshWallpassPanel, 50);
  });
  document.getElementById("closeWallpass")?.addEventListener("click", e => {
    e.preventDefault();
    if (wall) wall.hidden = true;
  });
  wall?.addEventListener("click", e => {
    if (e.target === wall) wall.hidden = true;
  });

  // WallPass closed — no free activation
  document.querySelectorAll(".wp-buy").forEach(btn => {
    btn.disabled = true;
    btn.textContent = "No disponible";
    btn.addEventListener("click", e => {
      e.preventDefault();
      const st = document.getElementById("wallpassStatus");
      if (st) {
        st.textContent = "WallPass está en producción y cerrado temporalmente. No se pueden activar membresías todavía.";
        st.style.color = "#f0d090";
      }
    });
  });
  // Clear any previously activated free tiers
  try {
    localStorage.removeItem("orbye_wallpass_tier");
    localStorage.removeItem("orbye_wallpass_active");
  } catch (_) {}

  document.getElementById("wpCancelPlan")?.addEventListener("click", () => {
    localStorage.removeItem("orbye_wallpass_tier");
    localStorage.removeItem("orbye_wallpass_active");
    const st = document.getElementById("wallpassStatus");
    if (st) { st.textContent = "WallPass cerrado por ahora."; st.style.color = "#aaa"; }
    refreshWallpassPanel();
    try {
      const b = document.getElementById("vdLoginBtn");
      const u = localStorage.getItem("orbye_demo_user");
      if (b) { b.hidden = !!u; b.style.display = u ? "none" : ""; }
    } catch(_) {}
    window.dispatchEvent(new CustomEvent("orbye-login"));
  });

  document.getElementById("wpOptBoost")?.addEventListener("change", e => {
    localStorage.setItem("orbye_wp_opt_boost", e.target.checked ? "1" : "0");
  });
  document.getElementById("wpOptBadge")?.addEventListener("change", e => {
    localStorage.setItem("orbye_wp_opt_badge", e.target.checked ? "1" : "0");
    refreshMembershipBadge();
  });
  document.getElementById("wpOptPublicStats")?.addEventListener("change", e => {
    localStorage.setItem("orbye_wp_opt_public", e.target.checked ? "1" : "0");
  });


  document.getElementById("requestUserVerify")?.addEventListener("click", () => {
    const msg = document.getElementById("verifyMsg");
    if (msg) {
      msg.textContent = "Verificación aún no disponible. WallPass está en producción.";
      msg.style.color = "#f0d090";
    }
    return;
    const user = localStorage.getItem("orbye_demo_user");
    if (!user) {
      if (accountPanel) accountPanel.hidden = false;
      return;
    }
    // Official badge only for platform creator account
    const email = (localStorage.getItem("orbye_demo_email") || "").toLowerCase();
    const isCreator = email === "avilarodriguezdavid13@gmail.com" || user === "DavidAvila";
    try {
      const profiles = JSON.parse(localStorage.getItem("orbye_user_profiles_v1") || "{}");
      if (!profiles[user]) profiles[user] = {};
      if (isCreator) {
        profiles[user].official = true;
        profiles[user].verified = true;
        localStorage.setItem("orbye_user_profiles_v1", JSON.stringify(profiles));
        if (msg) { msg.textContent = "Marca oficial OrbyE activada en tu cuenta."; msg.style.color = "#6dce8a"; }
      } else {
        profiles[user].verified = true;
        localStorage.setItem("orbye_user_profiles_v1", JSON.stringify(profiles));
        if (msg) { msg.textContent = "Verificación de cuenta solicitada/activada (sistema OrbyE)."; msg.style.color = "#6dce8a"; }
      }
    } catch {}
  });

  document.getElementById("verifyMySpaceBtn")?.addEventListener("click", () => {
    const msg = document.getElementById("verifyMsg");
    if (msg) {
      msg.textContent = "Verificar Space aún no disponible. WallPass está en producción.";
      msg.style.color = "#f0d090";
    }
    return;
    const tier = localStorage.getItem("orbye_wallpass_tier") || "";
    if (tier !== "plus" && tier !== "ultimate" && localStorage.getItem("orbye_demo_role") !== "admin") {
      if (msg) { msg.textContent = "Necesitas WallPass Plus ($14) o Ultimate para verificar un Space."; msg.style.color = "#f88"; }
      return;
    }
    try {
      const spaces = JSON.parse(localStorage.getItem("orbye_spaces_v2") || "{}");
      const user = localStorage.getItem("orbye_demo_user");
      const mine = Object.values(spaces).filter(s => s.owner === user);
      if (!mine.length) {
        if (msg) { msg.textContent = "Crea un Space primero."; msg.style.color = "#f88"; }
        return;
      }
      // verify most recent owned
      const s = mine.sort((a,b) => (b.createdAt||0)-(a.createdAt||0))[0];
      s.verified = true;
      spaces[s.id] = s;
      localStorage.setItem("orbye_spaces_v2", JSON.stringify(spaces));
      if (msg) { msg.textContent = "Space verificado: " + s.name; msg.style.color = "#6dce8a"; }
      try {
      const b = document.getElementById("vdLoginBtn");
      const u = localStorage.getItem("orbye_demo_user");
      if (b) { b.hidden = !!u; b.style.display = u ? "none" : ""; }
    } catch(_) {}
    window.dispatchEvent(new CustomEvent("orbye-login"));
    } catch (e) {
      if (msg) msg.textContent = "Error al verificar Space.";
    }
  });

  refreshLoginButton();
  refreshMembershipBadge();
})();
