
window.isOrbyeModUser = function(username) {
  if (!username) return false;
  if (typeof window.orbyeIsGlobalMod === "function") return window.orbyeIsGlobalMod(username);
  if (false && username === "DavidAvila") return true;
  try {
    const accounts = JSON.parse(localStorage.getItem("orbye_accounts_v1") || "{}");
    if (accounts[username] && accounts[username].role === "admin") return true;
  } catch {}
  try {
    const staff = JSON.parse(localStorage.getItem("orbye_staff_members_v1") || "[]");
    if (staff.includes(username)) return true;
  } catch {}
  try {
    const gmods = JSON.parse(localStorage.getItem("orbye_global_mods_v1") || "[]");
    if (gmods.includes(username)) return true;
  } catch {}
  try {
    const spaces = JSON.parse(localStorage.getItem("orbye_spaces_v2") || "{}");
    return Object.values(spaces).some(s => s.owner === username || (s.mods || []).includes(username));
  } catch {}
  return false;
};
window.orbyeModBadgeHtml = function(username) {
  if (!window.isOrbyeModUser(username)) return "";
  return '<span class="orbye-mod-badge" title="Moderador verificado OrbyE"><img src="assets/orbye-logo.png" alt="Mod">Mod</span>';
};

(() => {
  const PROFILE_KEY = "orbye_user_profiles_v1";
  /* MERGE_CLOUD_PROFILE: esta laptop gana si ya tiene foto/bio */
  window.orbyeMergeCloudProfile = async function(username) {
    if (!window.orbyeCloud || !window.orbyeCloud.getProfile) return;
    try {
      const cloud = await window.orbyeCloud.getProfile(username);
      if (!cloud) return;
      const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      const local = all[username] || {};
      const merged = {
        displayName: local.displayName || cloud.display_name || username,
        bio: (local.bio && local.bio.length) ? local.bio : (cloud.bio || ""),
        photo: local.photo || cloud.photo_url || null,
        banner: local.banner || cloud.banner_url || null,
        adultOk: local.adultOk != null ? local.adultOk : !!cloud.is_adult
      };
      // if local has richer data, push it back
      if (local.photo || local.banner || (local.bio && local.bio.length > (cloud.bio||"").length)) {
        await window.orbyeCloud.upsertProfile(username, merged);
      }
      all[username] = Object.assign({}, local, {
        displayName: merged.displayName,
        bio: merged.bio,
        photo: merged.photo || local.photo,
        banner: merged.banner || local.banner,
        adultOk: merged.adultOk
      });
      localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
      console.log("[OrbyE] perfil fusionado (prioridad esta laptop)");
    } catch (e) { console.warn(e); }
  };

  function countUserVideos(user) {
    const lists = [];
    try { lists.push(...JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || "[]")); } catch {}
    try { lists.push(...JSON.parse(localStorage.getItem("orbye_veltx_meta_v1") || "[]")); } catch {}
    return lists.filter(v => v && (v.user === user || v.author === user || v.owner === user || v.username === user)).length;
  }
  function sumUserLikes(user) {
    let n = 0;
    try {
      const st = Object.assign(
        {},
        JSON.parse(localStorage.getItem("orbye_orbytube_stats_v2") || "{}"),
        JSON.parse(localStorage.getItem("orbye_orbytube_stats_v3") || "{}")
      );
      const lists = [];
      try { lists.push(...JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || "[]")); } catch {}
      lists.filter(v => v && (v.user === user || v.author === user)).forEach(v => {
        const s = st[v.id];
        if (s) n += Number(s.likes || 0);
      });
    } catch {}
    return n;
  }

  const SOCIAL_KEY = "orbye_social_v1";
  const USER_KEY = "orbye_demo_user";

  const panel = document.getElementById("profilePanel");
  const openBtn = document.getElementById("profileButton");
  const closeBtn = document.getElementById("closeProfile");
  const saveBtn = document.getElementById("saveProfileBtn");
  const photoInput = document.getElementById("profilePhotoInput");
  const bannerInput = document.getElementById("profileBannerInput");
  const bioInput = document.getElementById("profileBioInput");
  const adultOk = document.getElementById("profileAdultOk");
  const msg = document.getElementById("profileMsg");
  const avatarPrev = document.getElementById("profileAvatarPreview");
  const bannerPrev = document.getElementById("profileBannerPreview");
  const displayName = document.getElementById("profileDisplayName");
  const bioText = document.getElementById("profileBioText");

  const pubPanel = document.getElementById("publicProfilePanel");
  const closePub = document.getElementById("closePublicProfile");
  let viewingUser = null;

  function getUser() {
    return localStorage.getItem(USER_KEY) || null;
  }

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); } catch { return {}; }
  }

  function saveAll(obj) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(obj));
      return true;
    } catch {
      if (msg) msg.textContent = "No se pudo guardar (imagen muy grande).";
      return false;
    }
  }

  function getProfile(user) {
    const all = loadAll();
    return all[user] || { photo: null, banner: null, bio: "", adultOk: false };
  }

  function loadSocial() {
    try { return JSON.parse(localStorage.getItem(SOCIAL_KEY) || "{}"); } catch { return {}; }
  }

  function saveSocial(s) {
    localStorage.setItem(SOCIAL_KEY, JSON.stringify(s));
  }

  function ensureSocialUser(graph, name) {
    if (!graph[name]) graph[name] = { following: [], followers: [], friends: [] };
    if (!graph[name].following) graph[name].following = [];
    if (!graph[name].followers) graph[name].followers = [];
    if (!graph[name].friends) graph[name].friends = [];
    return graph[name];
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
    el._timer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function computeStats(user) {
    let posts = 0, views = 0, videos = 0, likes = 0;
    const u = String(user || "").toLowerCase();
    try {
      const all = JSON.parse(localStorage.getItem("orbye_space_posts_v2") || "{}");
      Object.values(all).forEach(list => {
        (list || []).forEach(p => {
          if (String(p.user || "").toLowerCase() === u) {
            posts++;
            views += p.views || 0;
            likes += p.likes || 0;
          }
        });
      });
    } catch {}
    try {
      const vids = [].concat(
        JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || "[]"),
        JSON.parse(localStorage.getItem("orbye_veltx_meta_v1") || "[]")
      );
      // merge stats keys (v2 y v3 por si acaso)
      let stats = {};
      try { Object.assign(stats, JSON.parse(localStorage.getItem("orbye_orbytube_stats_v2") || "{}")); } catch {}
      try { Object.assign(stats, JSON.parse(localStorage.getItem("orbye_orbytube_stats_v3") || "{}")); } catch {}
      vids.forEach(v => {
        if (String(v.uploader || "").toLowerCase() === u) {
          videos++;
          const st = stats[v.id] || {};
          views += st.views || 0;
          likes += st.likes || 0;
        }
      });
    } catch {}
    return { posts, videos, views, likes };
  }

  function compressDataUrl(dataUrl, maxW, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality || 0.72));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function readImage(file, maxMB, cb) {
    if (!file) return;
    const ok = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(file.name || "");
    if (!ok) {
      showToast("Solo imágenes", "error");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      showToast("Imagen máx. " + maxMB + " MB", "error");
      return;
    }
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  }

  function refreshOpenButton() {
    const user = getUser();
    if (openBtn) openBtn.hidden = !user;
    refreshProfileButton();
  }

  async function refreshProfileButton() {
    const btnAv = document.getElementById("profileBtnAvatar");
    const btn = document.getElementById("profileButton");
    if (!btnAv) return;
    const user = getUser();
    if (btn) {
      btn.hidden = !user;
      btn.style.display = user ? "inline-flex" : "none";
    }
    if (!user) {
      btnAv.innerHTML = "?";
      btnAv.style.backgroundImage = "";
      return;
    }
    let photo = null;
    try {
      const p = getProfile(user);
      if (p.photo && p.photo !== "idb" && String(p.photo).indexOf("data:") === 0) photo = p.photo;
      if (!photo && typeof window.orbyeProfileMediaGet === "function") {
        photo = await window.orbyeProfileMediaGet(user + ":photo");
      }
    } catch (_) {}
    if (photo) {
      btnAv.innerHTML = '<img src="' + photo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
      btnAv.style.backgroundImage = "";
    } else {
      btnAv.innerHTML = "";
      btnAv.style.backgroundImage = "";
      btnAv.textContent = (user || "?").charAt(0).toUpperCase();
    }
    // También en el chip de cuenta (DavidAvila · ...)
    let chip = document.getElementById("accountChip");
    if (chip) {
      let av = chip.querySelector(".chip-av");
      if (!av) {
        av = document.createElement("span");
        av.className = "chip-av";
        chip.insertBefore(av, chip.firstChild);
      }
      if (photo) {
        av.innerHTML = '<img src="' + photo + '" alt="">';
      } else {
        av.textContent = (user || "?").charAt(0).toUpperCase();
      }
    }
  }

  window.__orbyeAvatarCache = window.__orbyeAvatarCache || {};
  function avatarHtml(user, sizeClass) {
    const p = getProfile(user);
    let photo = null;
    if (p.photo && p.photo !== "idb" && String(p.photo).indexOf("data:") === 0) photo = p.photo;
    if (!photo && window.__orbyeAvatarCache[user]) photo = window.__orbyeAvatarCache[user];
    if (!photo && typeof window.orbyeProfileMediaGet === "function") {
      window.orbyeProfileMediaGet(user + ":photo").then(url => {
        if (url) {
          window.__orbyeAvatarCache[user] = url;
          document.querySelectorAll('.user-avatar-img[data-u="'+user+'"]').forEach(img => { img.src = url; });
          document.querySelectorAll('[data-avatar-user="'+user+'"]').forEach(el => {
            el.outerHTML = '<img class="user-avatar-img" data-u="'+user+'" src="'+url+'" alt="">';
          });
          refreshProfileButton();
        }
      }).catch(() => {});
    }
    if (photo) {
      return `<img class="user-avatar-img ${sizeClass || ""}" data-u="${user}" src="${photo}" alt="${user}">`;
    }
    return `<span class="user-avatar-fallback ${sizeClass || ""}" data-avatar-user="${user}">${(user || "?").charAt(0).toUpperCase()}</span>`;
  }

  async function renderProfile() {
    /* FORCE_PHOTO_RELOAD */
    const user = getUser();
    if (!user) return;
    const p = getProfile(user);
    // Cargar foto/banner desde IndexedDB si existen
    try {
      if (typeof window.orbyeProfileMediaGet === "function") {
        const photo = await window.orbyeProfileMediaGet(user + ":photo");
        const banner = await window.orbyeProfileMediaGet(user + ":banner");
        if (photo) p.photo = photo;
        if (banner) p.banner = banner;
      }
    } catch (_) {}

    const handleEl = document.getElementById("profileHandle");
    if (handleEl) handleEl.textContent = "@" + (p.username || user);
    if (displayName) {
      const mod = window.orbyeModBadgeHtml ? window.orbyeModBadgeHtml(user) : "";
      const shown = (p.displayName || p.username || user);
      displayName.innerHTML = esc(shown) + mod;
    }
    if (bioText) bioText.textContent = p.bio || "Sin descripción";
    if (bioInput) bioInput.value = p.bio || "";
    const dIn = document.getElementById("profileDisplayInput");
    const uIn = document.getElementById("profileUsernameInput");
    if (dIn) dIn.value = p.displayName || user;
    if (uIn) uIn.value = p.username || user;
    if (adultOk) adultOk.checked = !!p.adultOk;

    const photoSrc = (p.photo && p.photo !== "idb" && (String(p.photo).indexOf("data:") === 0 || String(p.photo).indexOf("http") === 0 || String(p.photo).indexOf("blob:") === 0))
      ? p.photo
      : (window.__orbyeAvatarCache[user] || null);
    const bannerSrc = (p.banner && p.banner !== "idb" && (String(p.banner).indexOf("data:") === 0 || String(p.banner).indexOf("http") === 0 || String(p.banner).indexOf("blob:") === 0))
      ? p.banner
      : null;
    if (avatarPrev) {
      if (photoSrc) {
        avatarPrev.innerHTML = '<img src="' + photoSrc + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
        window.__orbyeAvatarCache[user] = photoSrc;
      } else {
        avatarPrev.innerHTML = "";
        avatarPrev.textContent = (user || "?").charAt(0).toUpperCase();
      }
    }
    if (bannerPrev) {
      bannerPrev.hidden = false;
      bannerPrev.style.display = "block";
      if (bannerSrc) {
        bannerPrev.style.backgroundImage = "url(" + bannerSrc + ")";
        bannerPrev.style.backgroundSize = "cover";
        bannerPrev.style.backgroundPosition = "center";
      } else {
        bannerPrev.style.backgroundImage = "";
      }
    }

    const st = computeStats(user);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
    set("profPosts", st.posts);
    set("profVideos", st.videos);
    set("profViews", st.views);
    set("profLikes", st.likes);
    // TikTok-style counts
    try {
      const graph = loadSocial();
      const node = ensureSocialUser(graph, user);
      set("profFollowing", (node.following || []).length);
      set("profFollowers", (node.followers || []).length);
    } catch (_) {}
    renderUserVideoGrid("ownVideoGrid", user);
  }

  function renderUserVideoGrid(elId, username) {
    const grid = document.getElementById(elId);
    if (!grid) return;
    let items = [];
    try {
      const meta = JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || localStorage.getItem("orbye_orbytube_meta_v2") || "[]");
      items = meta.filter(v => (v.uploader || "").toLowerCase() === (username || "").toLowerCase());
    } catch (_) {}
    if (!items.length) {
      grid.innerHTML = '<p class="muted" style="grid-column:1/-1;padding:12px">Sin vídeos aún</p>';
      return;
    }
    grid.innerHTML = items.slice(0, 24).map(v => {
      const thumb = v.cover || "";
      const views = (v.views != null ? v.views : "");
      return `<button type="button" class="tt-grid-item" data-vid="${v.id}">
        ${thumb ? `<img src="${thumb}" alt="">` : `<div class="tt-grid-ph">▶</div>`}
        <span class="tt-grid-views">▶ ${views || "0"}</span>
      </button>`;
    }).join("");
  }

  function renderUserList(el, names) {
    if (!el) return;
    if (!names || !names.length) {
      el.innerHTML = '<span class="muted" style="font-size:12px">Nadie aún</span>';
      return;
    }
    el.innerHTML = names.map(n =>
      `<button type="button" class="pub-user-chip" data-open-user="${n}">${avatarHtml(n, "tiny")}<span>${n}</span></button>`
    ).join("");
  }

  function openPublicProfile(username) {
    // ensure DOM refs for public profile media
    const pubBannerEl = document.getElementById("pubBanner") || document.querySelector("#publicProfilePanel .profile-banner");
    const pubAvatarEl = document.getElementById("pubAvatar");
    const pubBioEl = document.getElementById("pubBio") || document.getElementById("pubBioText");

    if (!username) return;
    viewingUser = username;
    const p = getProfile(username);
    const st = computeStats(username);
    const graph = loadSocial();
    const node = ensureSocialUser(graph, username);

    const pubName = document.getElementById("pubName");
    const pubBio = document.getElementById("pubBio");
    const pubAvatar = document.getElementById("pubAvatar");
    const pubBanner = document.getElementById("pubBanner");
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };

    if (pubBannerEl) {
      if (p.banner) {
        pubBannerEl.style.backgroundImage = "url(" + p.banner + ")";
        pubBannerEl.style.backgroundSize = "cover";
        pubBannerEl.style.backgroundPosition = "center";
      } else {
        pubBannerEl.style.backgroundImage = "";
      }
    }
    if (pubAvatarEl) {
      if (p.photo) pubAvatarEl.innerHTML = '<img src="' + p.photo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
      else pubAvatarEl.textContent = (username || "?")[0].toUpperCase();
    }
    if (pubBioEl) pubBioEl.textContent = p.bio || "Sin descripción";
    // never show birthDate publicly
    if (pubName) {
      const badge = p.official ? ' <span class="orbye-official" title="Oficial OrbyE"><img src="assets/orbye-logo.png" alt="OrbyE"></span>' : (p.verified ? ' <span class="orbye-verified" title="Verificado">✓</span>' : '');
      pubName.innerHTML = esc(p.displayName || username) + badge + (window.orbyeModBadgeHtml ? window.orbyeModBadgeHtml(username) : '');
    }
    if (pubBio) pubBio.textContent = p.bio || "Sin descripción";
    if (pubAvatar) {
      if (p.photo) pubAvatar.innerHTML = `<img src="${p.photo}" alt="">`;
      else pubAvatar.textContent = username.charAt(0).toUpperCase();
    }
    if (pubBanner) {
      pubBanner.style.backgroundImage = p.banner ? `url(${p.banner})` : "";
    }
    set("pubPosts", st.posts);
    set("pubVideos", st.videos);
    set("pubLikes", st.likes);
    set("pubFollowers", node.followers.length);
    set("pubFollowing", node.following.length);
    set("pubFriends", node.friends.length);

    renderUserList(document.getElementById("pubFollowersList"), node.followers);
    renderUserList(document.getElementById("pubFollowingList"), node.following);
    renderUserList(document.getElementById("pubFriendsList"), node.friends);

    const me = getUser();
    const followBtn = document.getElementById("pubFollowBtn");
    const friendBtn = document.getElementById("pubFriendBtn");
    const pubMsg = document.getElementById("pubMsg");
    if (pubMsg) pubMsg.textContent = "";

    if (!me || me === username) {
      if (followBtn) { followBtn.disabled = true; followBtn.textContent = me === username ? "Tu perfil" : "Seguir"; }
      if (friendBtn) { friendBtn.disabled = true; friendBtn.textContent = "Amigos"; }
    } else {
      const meNode = ensureSocialUser(graph, me);
      const isFollowing = meNode.following.includes(username);
      const isFriend = meNode.friends.includes(username);
      if (followBtn) {
        followBtn.disabled = false;
        followBtn.textContent = isFollowing ? "Dejar de seguir" : "Seguir";
      }
      if (friendBtn) {
        friendBtn.disabled = false;
        friendBtn.textContent = isFriend ? "Ya son amigos" : "Agregar amigo";
      }
    }

    if (pubPanel) pubPanel.hidden = false;
  }

  async function hardLoadAvatar(user) {
    /* HARD_AVATAR_FIX */
    if (!user) return;
    let url = null;
    try {
      if (typeof window.orbyeProfileMediaGet === "function") {
        url = await window.orbyeProfileMediaGet(user + ":photo");
      }
    } catch (_) {}
    if (!url) {
      try {
        const all = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
        const p = all[user] || {};
        if (p.photo && String(p.photo).indexOf("data:") === 0) url = p.photo;
      } catch (_) {}
    }
    const av = document.getElementById("profileAvatarPreview");
    if (av && url) {
      av.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
      window.__orbyeAvatarCache = window.__orbyeAvatarCache || {};
      window.__orbyeAvatarCache[user] = url;
    }
    let ban = null;
    try {
      if (typeof window.orbyeProfileMediaGet === "function") {
        ban = await window.orbyeProfileMediaGet(user + ":banner");
      }
    } catch (_) {}
    if (!ban) {
      try {
        const all = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
        const p = all[user] || {};
        if (p.banner && String(p.banner).indexOf("data:") === 0) ban = p.banner;
      } catch (_) {}
    }
    const bn = document.getElementById("profileBannerPreview");
    if (bn) {
      bn.hidden = false;
      bn.style.display = "block";
      if (ban) {
        bn.style.backgroundImage = "url(" + ban + ")";
        bn.style.backgroundSize = "cover";
        bn.style.backgroundPosition = "center";
      }
    }
  }

  function openProfile() {
    const user = getUser();
    if (user && typeof window.orbyePullCloudProfile === "function") {
      window.orbyePullCloudProfile(user).then(() => {
        try { renderProfile(); } catch (_) {}
        hardLoadAvatar(user).catch(() => {});
      });
    }
    if (!user) {
      const ap = document.getElementById("accountPanel");
      if (ap) { ap.hidden = false; ap.style.display = "flex"; }
      showToast("Inicia sesión para ver tu perfil", "warn");
      return;
    }
    if (panel) {
      panel.hidden = false;
      panel.style.display = "flex";
    }
    hardLoadAvatar(user).catch(() => {});
    // Relleno inmediato para que no se vea "Usuario"
    const p0 = getProfile(user);
    if (displayName) displayName.textContent = p0.displayName || user;
    const handleEl = document.getElementById("profileHandle");
    if (handleEl) handleEl.textContent = "@" + (p0.username || user);
    const dIn = document.getElementById("profileDisplayInput");
    const uIn = document.getElementById("profileUsernameInput");
    if (dIn) dIn.value = p0.displayName || user;
    if (uIn) uIn.value = p0.username || user;
    if (p0.photo && p0.photo !== "idb" && avatarPrev) {
      avatarPrev.innerHTML = `<img src="${p0.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }
    if (p0.banner && p0.banner !== "idb" && bannerPrev) {
      bannerPrev.style.backgroundImage = "url(" + p0.banner + ")";
      if (window.orbyePaintBanner) window.orbyePaintBanner(p0.banner);
      bannerPrev.style.backgroundSize = "cover";
    }
    renderProfile().catch(err => console.warn("renderProfile", err));
  }

  openBtn?.addEventListener("click", openProfile);
  window.addEventListener("orbye-open-my-profile", openProfile);
  // FIX_LOGIN_PROFILE
  document.addEventListener("click", function(e) {
    if (e.target.closest("#profileButton")) {
      e.preventDefault();
      openProfile();
    }
  }, true);
  closeBtn?.addEventListener("click", e => {
    e.preventDefault();
    if (panel) panel.hidden = true;
  });
  panel?.addEventListener("click", e => {
    if (e.target === panel) panel.hidden = true;
  });
  closePub?.addEventListener("click", e => {
    e.preventDefault();
    if (pubPanel) pubPanel.hidden = true;
  });
  pubPanel?.addEventListener("click", e => {
    if (e.target === pubPanel) pubPanel.hidden = true;
  });

  document.getElementById("pubFollowBtn")?.addEventListener("click", () => {
    const me = getUser();
    if (!me || !viewingUser || me === viewingUser) return;
    const graph = loadSocial();
    const meNode = ensureSocialUser(graph, me);
    const them = ensureSocialUser(graph, viewingUser);
    const idx = meNode.following.indexOf(viewingUser);
    if (idx >= 0) {
      meNode.following.splice(idx, 1);
      const fidx = them.followers.indexOf(me);
      if (fidx >= 0) them.followers.splice(fidx, 1);
      showToast("Dejaste de seguir a " + viewingUser, "info");
    } else {
      meNode.following.push(viewingUser);
      if (!them.followers.includes(me)) them.followers.push(me);
      showToast("Ahora sigues a " + viewingUser, "ok");
    }
    saveSocial(graph);
    openPublicProfile(viewingUser);
  });

  document.getElementById("pubFriendBtn")?.addEventListener("click", () => {
    const me = getUser();
    if (!me || !viewingUser || me === viewingUser) return;
    if (typeof window.orbyeSendFriendRequest === "function") {
      const ok = window.orbyeSendFriendRequest(viewingUser);
      showToast(ok ? "Solicitud de amistad enviada" : "No se pudo enviar (ya enviada o ya son amigos)", ok ? "ok" : "info");
    }
    openPublicProfile(viewingUser);
  });

  let pendingPhoto = null;
  let pendingBanner = null;

  document.getElementById("profPhotoPick")?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); photoInput?.click(); });
  document.getElementById("profBannerPick")?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); bannerInput?.click(); });
  document.getElementById("profileAvatarPreview")?.addEventListener("click", () => photoInput?.click());
  function showOwnTab(tab) {
    const grid = document.getElementById("ownVideoGrid");
    const edit = document.getElementById("ttEditPane");
    const banner = document.getElementById("profileBannerPreview");
    const tV = document.getElementById("ttTabVideos");
    const tE = document.getElementById("ttTabEdit");
    if (tab === "edit") {
      if (grid) grid.hidden = true;
      if (edit) edit.hidden = false;
      if (banner) { banner.hidden = false; banner.style.display = "block"; }
      tV?.classList.remove("active");
      tE?.classList.add("active");
    } else {
      if (grid) grid.hidden = false;
      if (edit) edit.hidden = true;
      if (banner) { banner.hidden = false; banner.style.display = "block"; }
      tE?.classList.remove("active");
      tV?.classList.add("active");
    }
  }
  document.getElementById("ttTabVideos")?.addEventListener("click", () => showOwnTab("videos"));
  document.getElementById("ttTabEdit")?.addEventListener("click", () => showOwnTab("edit"));
  document.addEventListener("click", e => {
    if (e.target.closest("#profPhotoPick")) { e.preventDefault(); photoInput?.click(); }
    if (e.target.closest("#profBannerPick")) { e.preventDefault(); bannerInput?.click(); }
  });

  async function quickSaveMedia() {
    const user = getUser();
    if (!user) return;
    // simula click guardar si hay cambios de media
    if (saveBtn) saveBtn.click();
  }

  photoInput?.addEventListener("change", () => {
    const f = photoInput.files?.[0];
    readImage(f, 4, async url => {
      pendingPhoto = url;
      if (avatarPrev) avatarPrev.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      showToast("Guardando foto…", "info");
      setTimeout(() => { if (saveBtn) saveBtn.click(); }, 80);
    });
  });

  bannerInput?.addEventListener("change", () => {
    /* BANNER_FORCE_SHOW */
    const f = bannerInput.files?.[0];
    readImage(f, 5, url => {
      pendingBanner = url;
      if (bannerPrev) {
        bannerPrev.style.backgroundImage = "url(" + url + ")";
        if (window.orbyeForceBanner) window.orbyeForceBanner(url);
        bannerPrev.style.backgroundSize = "cover";
        bannerPrev.style.backgroundPosition = "center";
      }
      showToast("Guardando banner…", "info");
      setTimeout(() => { if (saveBtn) saveBtn.click(); }, 80);
    });
  });

  // push after save is handled below
    saveBtn?.addEventListener("click", async () => {
    const user = getUser();
    if (!user) {
      showToast("Inicia sesión para guardar el perfil", "error");
      return;
    }
    showToast("Guardando perfil…", "info");
    const all = loadAll();
    const prev = all[user] || {};
    const dIn = document.getElementById("profileDisplayInput");
    const uIn = document.getElementById("profileUsernameInput");
    let displayNameVal = (dIn?.value || "").trim().slice(0, 32) || user;
    let username = (uIn?.value || "").trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || user;

    const changes = prev.nameChanges || [];
    const windowMs = 3 * 24 * 60 * 60 * 1000;
    const recent = changes.filter(t => Date.now() - t < windowMs);
    const nameChanged = (displayNameVal !== (prev.displayName || user)) || (username !== (prev.username || user));
    if (nameChanged && recent.length >= 2) {
      if (msg) {
        msg.textContent = "Límite: solo 2 cambios de nombre/usuario cada 3 días.";
        msg.style.color = "#f88";
      }
      showToast("Límite de cambios de nombre", "error");
      return;
    }
    if (nameChanged) recent.push(Date.now());

    let photo = pendingPhoto !== null ? pendingPhoto : (prev.photo || null);
    let banner = pendingBanner !== null ? pendingBanner : (prev.banner || null);
    try {
      if (pendingPhoto) photo = await compressDataUrl(pendingPhoto, 256, 0.75);
      if (pendingBanner) banner = await compressDataUrl(pendingBanner, 900, 0.7);
    } catch (_) {}

    // Guardar imágenes en IndexedDB (no se pierden por cuota de localStorage)
    try {
      if (photo && typeof window.orbyeProfileMediaSet === "function") {
        await window.orbyeProfileMediaSet(user + ":photo", photo);
      }
      if (banner && typeof window.orbyeProfileMediaSet === "function") {
        await window.orbyeProfileMediaSet(user + ":banner", banner);
      }
    } catch (e) {
      console.warn("idb media", e);
    }

    all[user] = {
      photo: photo ? "idb" : null,
      banner: banner ? "idb" : null,
      photoUrl: null,
      bannerUrl: null,
      bio: (bioInput?.value || "").trim().slice(0, 200),
      adultOk: !!(adultOk && adultOk.checked),
      displayName: displayNameVal,
      username,
      nameChanges: recent,
      official: prev.official || false,
      verified: prev.verified || false,
      isAdult: prev.isAdult,
      birthDate: prev.birthDate,
      hasPhoto: !!photo,
      hasBanner: !!banner
    };
    // También intenta guardar miniatura pequeña en localStorage como respaldo
    try {
      if (photo) {
        const tiny = await compressDataUrl(photo, 96, 0.6);
        all[user].photo = tiny;
        if (avatarPrev) avatarPrev.innerHTML = '<img src="' + tiny + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
      }
      if (banner) {
        const tinyB = await compressDataUrl(banner, 400, 0.55);
        all[user].banner = tinyB;
        if (typeof window.orbyePaintBanner === "function") window.orbyePaintBanner(tinyB);
        else if (bannerPrev) {
          bannerPrev.style.backgroundImage = "url(" + tinyB + ")";
          bannerPrev.style.backgroundSize = "cover";
        }
      }
    } catch (_) {}

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
      try { /* DUAL_PROFILE_SAVE */
        localStorage.setItem("orbye_profiles_v1", JSON.stringify(all));
      } catch (_) {}
    } catch (err) {
      // Si falla por tamaño, guarda solo texto
      try {
        all[user].photo = all[user].hasPhoto ? "idb" : null;
        all[user].banner = all[user].hasBanner ? "idb" : null;
        localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
      try { /* DUAL_PROFILE_SAVE */
        localStorage.setItem("orbye_profiles_v1", JSON.stringify(all));
      } catch (_) {}
      } catch (e2) {
        if (msg) {
          msg.textContent = "No se pudo guardar el texto del perfil.";
          msg.style.color = "#f88";
        }
        showToast("Error al guardar perfil", "error");
        return;
      }
    }
    pendingPhoto = null;
    pendingBanner = null;
    if (msg) {
      msg.textContent = "Perfil guardado correctamente.";
      msg.style.color = "#6dce8a";
    }
    await renderProfile();
    showToast("Perfil actualizado", "ok");
    window.dispatchEvent(new CustomEvent("orbye-profile-updated"));
    refreshProfileButton();
  });

  // Click on any [data-user] opens public profile
  document.addEventListener("click", e => {
    const chip = e.target.closest("[data-open-user]");
    if (chip) {
      openPublicProfile(chip.dataset.openUser);
      return;
    }
    const el = e.target.closest("[data-user]");
    if (el && el.dataset.user) {
      openPublicProfile(el.dataset.user);
    }
  });

  window.addEventListener("orbye-profile-updated", () => refreshProfileButton());
  window.addEventListener("orbye-login", (ev) => {
    const u = (ev && ev.detail && ev.detail.user) || localStorage.getItem("orbye_demo_user");
    if (u && window.orbyePullCloudProfile) {
      window.orbyePullCloudProfile(u).then(() => {
        try { if (typeof renderProfile === "function") renderProfile(); } catch(_) {}
      });
    }
    refreshOpenButton();
    refreshProfileButton();
  });

  window.orbyeForceProfileReload = function() {
    const user = localStorage.getItem("orbye_demo_user");
    if (!user) return;
    renderProfile();
  };
  window.orbyeGetProfile = function (user) {
    return getProfile(user || getUser());
  };
  window.orbyeCanViewAdult = function () {
    const user = getUser();
    if (!user) return false;
    return !!getProfile(user).adultOk;
  };
  window.orbyeOpenProfile = openPublicProfile;
  window.orbyeAvatarHtml = avatarHtml;

  refreshOpenButton();
  refreshProfileButton();
  setTimeout(() => refreshProfileButton(), 400);
  setTimeout(() => refreshProfileButton(), 1200);
})();

window.orbyePaintBanner = function(url) {
  const bn = document.getElementById("profileBannerPreview");
  if (!bn || !url) return;
  bn.hidden = false;
  bn.style.display = "block";
  bn.style.height = "200px";
  bn.style.backgroundImage = "url(" + url + ")";
  bn.style.backgroundSize = "cover";
  bn.style.backgroundPosition = "center";
};

// SYNC_PROFILE_CLOUD — one account, no clones across devices
window.orbyePullCloudProfile = async function(username) {
  if (!username || !window.orbyeCloud?.enabled) return null;
  try {
    const row = await window.orbyeCloud.getProfile(username);
    if (!row) return null;
    const key = "orbye_profiles_v1";
    const all = JSON.parse(localStorage.getItem(key) || "{}");
    const prev = all[username] || {};
    all[username] = Object.assign({}, prev, {
      displayName: row.display_name || prev.displayName || username,
      username: row.username || username,
      bio: row.bio || prev.bio || "",
      adultOk: !!row.is_adult,
      role: row.role || prev.role || "user",
      // keep local photo/banner if cloud has no http url
      photo: (row.photo_url && String(row.photo_url).startsWith("http")) ? row.photo_url : prev.photo,
      banner: (row.banner_url && String(row.banner_url).startsWith("http")) ? row.banner_url : prev.banner
    });
    localStorage.setItem(key, JSON.stringify(all));
    // also mirror user profiles key
    try {
      const up = JSON.parse(localStorage.getItem("orbye_user_profiles_v1") || "{}");
      up[username] = all[username];
      localStorage.setItem("orbye_user_profiles_v1", JSON.stringify(up));
    } catch {}
    return all[username];
  } catch (e) {
    console.warn("pull profile", e);
    return null;
  }
};

window.orbyePushCloudProfile = async function(username) {
  if (!username || !window.orbyeCloud?.enabled) return;
  try {
    const all = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
    const p = all[username] || {};
    await window.orbyeCloud.upsertProfile(username, p);
  } catch (e) { console.warn("push profile", e); }
};

// After login / open profile — always prefer cloud identity
document.addEventListener("orbye-cloud-ready", () => {
  const u = localStorage.getItem("orbye_demo_user");
  if (u) window.orbyePullCloudProfile(u);
});
window.addEventListener("storage", (e) => {
  if (e.key === "orbye_demo_user" && e.newValue) {
    window.orbyePullCloudProfile(e.newValue);
  }
});

// PUSH_ON_SAVE
document.getElementById("saveProfileBtn")?.addEventListener("click", () => {
  setTimeout(() => {
    const u = localStorage.getItem("orbye_demo_user");
    if (u && window.orbyePushCloudProfile) window.orbyePushCloudProfile(u);
  }, 500);
});

// PROFILE_SYNC_INTERVAL — bi-directional every 20s when logged in
setInterval(async () => {
  const u = localStorage.getItem("orbye_demo_user");
  if (!u || !window.orbyeCloud?.enabled) return;
  try {
    if (window.orbyePullCloudProfile) await window.orbyePullCloudProfile(u);
  } catch (_) {}
}, 20000);

// OPEN_PROFILE_BANNER_FIX
document.getElementById("openProfileBtn")?.addEventListener("click", () => {
  setTimeout(async () => {
    const user = localStorage.getItem("orbye_demo_user");
    if (!user) return;
    try {
      let ban = null;
      if (window.orbyeProfileMediaGet) ban = await window.orbyeProfileMediaGet(user + ":banner");
      if (!ban) {
        const all = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
        const p = all[user];
        if (p && p.banner && p.banner !== "idb") ban = p.banner;
      }
      if (ban && window.orbyePaintBanner) window.orbyePaintBanner(ban);
    } catch (_) {}
  }, 200);
});

// STATS_FORCE_COUNT
(function(){
  function refreshCounts() {
    const user = localStorage.getItem("orbye_demo_user");
    if (!user) return;
    const vc = typeof countUserVideos === "function" ? countUserVideos(user) : 0;
    const lk = typeof sumUserLikes === "function" ? sumUserLikes(user) : 0;
    ["profVideoCount","profileVideoCount","ttVideoCount"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(vc);
    });
    document.querySelectorAll("[data-stat='videos']").forEach(el => { el.textContent = String(vc); });
    document.querySelectorAll("[data-stat='likes']").forEach(el => { el.textContent = String(lk); });
  }
  setInterval(refreshCounts, 3000);
  document.addEventListener("click", e => {
    if (e.target.closest("#openProfileBtn") || e.target.closest("#Mi perfil")) setTimeout(refreshCounts, 400);
  });
})();


/* BANNER_FORCE_V41 */
(function(){
  function paintAllBanners(src){
    if(!src || src === "idb") return;
    var els = [
      document.getElementById("profileBannerPreview"),
      document.getElementById("pubBanner"),
      document.querySelector("#publicProfilePanel .profile-banner"),
      document.querySelector(".profile-banner"),
      document.querySelector("[data-profile-banner]")
    ];
    els.forEach(function(el){
      if(!el) return;
      el.hidden = false;
      el.style.display = "block";
      el.style.minHeight = "140px";
      el.style.backgroundImage = "url(" + src + ")";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
    });
  }
  window.orbyePaintBanner = paintAllBanners;

  // After save/change, also persist data URL to local profile + paint
  document.addEventListener("change", function(e){
    if(!e.target || e.target.id !== "profileBannerInput") return;
    var f = e.target.files && e.target.files[0];
    if(!f) return;
    var r = new FileReader();
    r.onload = function(){
      var url = r.result;
      paintAllBanners(url);
      try {
        var user = localStorage.getItem("orbye_demo_user");
        if(!user) return;
        var all = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
        all[user] = all[user] || {};
        all[user].banner = url;
        localStorage.setItem("orbye_profiles_v1", JSON.stringify(all));
      } catch(err){}
    };
    r.readAsDataURL(f);
  }, true);

  // Re-apply on load
  setTimeout(function(){
    try {
      var user = localStorage.getItem("orbye_demo_user");
      if(!user) return;
      var all = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
      var p = all[user];
      if(p && p.banner && String(p.banner).indexOf("data:") === 0) paintAllBanners(p.banner);
    } catch(e){}
  }, 1000);
})();

/* boot merge */
setTimeout(function(){
  try {
    var u = localStorage.getItem("orbye_demo_user");
    if (u && window.orbyeMergeCloudProfile) window.orbyeMergeCloudProfile(u);
  } catch(e){}
}, 2000);

/* FORCE_PROFILE_RENDER on panel open */
(function(){
  function force(){
    var user = localStorage.getItem("orbye_demo_user");
    if (!user) return;
    try {
      if (typeof window.orbyeMergeCloudProfile === "function") window.orbyeMergeCloudProfile(user);
    } catch(e){}
    // re-read local profile into DOM
    try {
      var all = JSON.parse(localStorage.getItem("orbye_user_profiles_v1")||"{}");
      var p = all[user] || {};
      var av = document.getElementById("profileAvatarPreview");
      var ban = document.getElementById("profileBannerPreview");
      var name = document.getElementById("profileDisplayName");
      var handle = document.getElementById("profileHandle");
      var bio = document.getElementById("profileBioText");
      if (name) name.textContent = p.displayName || user;
      if (handle) handle.textContent = "@" + user;
      if (bio) bio.textContent = p.bio || "Sin descripción";
      function setAv(el, src){
        if (!el) return;
        if (src && (String(src).indexOf("data:")===0 || String(src).indexOf("http")===0 || String(src).indexOf("blob:")===0)) {
          el.innerHTML = '<img src="'+src+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
        }
      }
      if (p.photo) setAv(av, p.photo);
      if (typeof window.orbyeProfileMediaGet === "function") {
        window.orbyeProfileMediaGet(user+":photo").then(function(url){ if(url) setAv(av, url); });
        window.orbyeProfileMediaGet(user+":banner").then(function(url){
          if (url && ban) {
            ban.style.backgroundImage = "url("+url+")";
            ban.classList.add("orbye-banner-has-img");
          }
        });
      }
      if (p.banner && ban) {
        ban.style.backgroundImage = "url("+p.banner+")";
        ban.classList.add("orbye-banner-has-img");
      }
      // composer avatar
      var cav = document.getElementById("composerAvatar");
      if (cav && av && av.querySelector("img")) {
        cav.innerHTML = av.innerHTML;
      }
    } catch(e){}
  }
  var obs = new MutationObserver(function(){
    var panel = document.getElementById("profilePanel");
    if (panel && !panel.hidden) force();
  });
  setTimeout(function(){
    var panel = document.getElementById("profilePanel");
    if (panel) obs.observe(panel, { attributes:true, attributeFilter:["hidden"] });
    force();
  }, 800);
  document.getElementById("profileButton")?.addEventListener("click", function(){ setTimeout(force, 200); });
})();
