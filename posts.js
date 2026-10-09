(() => {
  const SPACES_KEY = "orbye_spaces_v2";
  const POSTS_KEY = "orbye_space_posts_v2";
  const USER_KEY = "orbye_demo_user";
  const ROLE_KEY = "orbye_demo_role";
  const WALLPASS_KEY = "orbye_wallpass_active";

  // User creates all Spaces — nothing pre-forced
  const BUILTIN = {};
  // Remove legacy Void of Darkness if still in storage
  try {
    const _sp = JSON.parse(localStorage.getItem(SPACES_KEY) || "{}");
    let _ch = false;
    Object.keys(_sp).forEach(k => {
      const n = (( _sp[k] && _sp[k].name) || k || "").toLowerCase();
      if (n.includes("void") && (n.includes("drak") || n.includes("dark") || n.includes("drake"))) {
        delete _sp[k]; _ch = true;
      }
    });
    if (_ch) localStorage.setItem(SPACES_KEY, JSON.stringify(_sp));
  } catch (e) {}


  let currentSpace = "";
  let currentChannel = "general";
  let pendingMedia = null;

  const spacesList = document.getElementById("spacesList");
  const feed = document.getElementById("postsFeed");
  const textEl = document.getElementById("postText");
  const publishBtn = document.getElementById("postPublish");
  const emojiBtn = document.getElementById("postEmojiBtn");
  const gifBtn = document.getElementById("postGifBtn");
  const videoBtn = document.getElementById("postVideoBtn");
  const mediaInput = document.getElementById("postMediaInput");
  const emojiPicker = document.getElementById("postEmojiPicker");
  const preview = document.getElementById("postPreview");
  const note = document.getElementById("postNote");
  const composerUser = document.getElementById("postComposerUser");
  const accountPanel = document.getElementById("accountPanel");
  const feedTitle = document.getElementById("feedCommTitle");
  const feedDesc = document.getElementById("feedCommDesc");
  const aboutText = document.getElementById("aboutCommText");
  const postCountEl = document.getElementById("postCount");
  const feedBanner = document.getElementById("feedBanner");

  const createBtn = document.getElementById("createSpaceBtn");
  const createModal = document.getElementById("createSpaceModal");
  const closeCreate = document.getElementById("closeCreateSpace");
  const confirmCreate = document.getElementById("confirmCreateSpace");
  const spaceNameInput = document.getElementById("spaceNameInput");
  const spaceDescInput = document.getElementById("spaceDescInput");
  const spaceIconInput = document.getElementById("spaceIconInput");
  const createSpaceMsg = document.getElementById("createSpaceMsg");

  const EMOJIS = ["🐉","🔥","✨","💜","🖤","⚡","🌌","👾","🎮","🎬","💬","❤️","👍","😂","🚀","🌙","⭐","💎","🛡️","👑","🎉","😎","🤝","💪"];

  function getUser() {
    try {
      var u = localStorage.getItem(USER_KEY) || localStorage.getItem("orbye_demo_user") || "";
      u = String(u).trim();
      return u || null;
    } catch (e) { return null; }
  }
  function isModerator() { const r = localStorage.getItem(ROLE_KEY); return r === "moderator" || r === "admin"; }
  function wallTier() { return localStorage.getItem("orbye_wallpass_tier") || ""; }
  function hasWallpass() { return !!wallTier() || localStorage.getItem(WALLPASS_KEY) === "1"; }

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
    el._timer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function openLogin() {
    if (accountPanel) accountPanel.hidden = false;
    showToast("Primero inicia sesión dentro de OrbyE.", "warn");
  }

  function requireLogin() {
    const user = getUser();
    if (user) return user;
    openLogin();
    return null;
  }

  function loadUserSpaces() {
    try { return JSON.parse(localStorage.getItem(SPACES_KEY) || "{}"); } catch { return {}; }
  }
  function saveUserSpaces(obj) { localStorage.setItem(SPACES_KEY, JSON.stringify(obj)); }

  function allSpaces() { return { ...BUILTIN, ...loadUserSpaces() }; }

  function isSpaceMod(space) {
    const user = getUser();
    if (!user || !space) return false;
    if (isModerator()) return true;
    if (space.owner === user) return true;
    return (space.mods || []).includes(user);
  }

  function slugify(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
      || "space-" + Date.now().toString(36);
  }

  function loadPosts(spaceId) {
    try {
      const all = JSON.parse(localStorage.getItem(POSTS_KEY) || "{}");
      return all[spaceId] || [];
    } catch { return []; }
  }

  function savePosts(spaceId, posts) {
    try {
      const all = JSON.parse(localStorage.getItem(POSTS_KEY) || "{}");
      all[spaceId] = posts;
      localStorage.setItem(POSTS_KEY, JSON.stringify(all));
      return true;
    } catch {
      showToast("No se pudo guardar. Archivo demasiado grande.", "error");
      return false;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function linkify(text) {
    return esc(text).replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a class="post-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleString("es-ES", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  function renderSpacesList() {
    if (!spacesList) return;
    const spaces = allSpaces();
    const list = Object.values(spaces);
    if (!list.length) {
      spacesList.innerHTML = '<p class="muted" style="padding:12px;font-size:12px">No hay Spaces.<br>Pulsa <b>+ Crear</b> para el primero.</p>';
      return;
    }
    spacesList.innerHTML = list.map(s => {
      const iconHtml = s.logo
        ? `<img class="comm-logo-img" src="${s.logo}" alt="">`
        : `<span>${s.icon || "🌌"}</span>`;
      return `<button type="button" class="comm-item ${s.id === currentSpace ? "active" : ""}" data-space="${esc(s.id)}">
        <span class="comm-icon">${iconHtml}</span>
        <span class="comm-info">
          <b>${esc(s.name)}</b>
          <small>${s.verified ? "✓ Verificado" : "Space · " + esc(s.owner || "")}</small>
        </span>
      </button>`;
    }).join("");
  }

  function renderModPanel(space) {
    let panel = document.getElementById("spaceModPanel");
    if (!isSpaceMod(space)) {
      if (panel) panel.remove();
      return;
    }
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "spaceModPanel";
      panel.className = "right-card space-mod-panel";
      const right = document.querySelector(".realm-right");
      if (right) right.insertBefore(panel, right.firstChild?.nextSibling || null);
      else return;
    }
    const rules = (space.rules || []).map((r, i) =>
      `<li>${esc(r)} <button type="button" data-del-rule="${i}" class="link-btn">✕</button></li>`
    ).join("") || "<li class='muted'>Sin reglas aún</li>";
    const tags = (space.tags || []).map(t =>
      `<span class="space-tag">${esc(t)}</span>`
    ).join("") || "<span class='muted'>Sin etiquetas</span>";

    panel.innerHTML = `
      <h3>Moderación</h3>
      <p class="muted" style="font-size:12px;margin:0 0 10px">Solo dueño / mods</p>
      <label class="mod-label">Logo (foto)
        <input type="file" id="spaceLogoFile" accept="image/*">
      </label>
      <label class="mod-label">Banner (foto)
        <input type="file" id="spaceBannerFile" accept="image/*">
      </label>
      <div class="mod-rules">
        <b>Reglas</b>
        <ul id="rulesList">${rules}</ul>
        <div class="mod-add-row">
          <input id="newRuleInput" type="text" placeholder="Nueva regla" maxlength="120">
          <button type="button" id="addRuleBtn" class="vd-btn ghost">Añadir</button>
        </div>
      </div>
      <div class="mod-tags">
        <b>Reconocimientos / etiquetas (usuarios pueden tomarla)</b>
        <div class="tags-wrap">${tags}</div>
        <div class="mod-add-row">
          <input id="newTagInput" type="text" placeholder="Ej: Veterano" maxlength="30">
          <button type="button" id="addTagBtn" class="vd-btn ghost">Añadir</button>
        </div>
      </div>
      <div class="mod-adult-row">
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;color:#ccc">
          <input type="checkbox" id="spaceAdult18" ${space.adult18 ? "checked" : ""}>
          Space 18+ (contenido adultos)
        </label>
      </div>
    `;
  }

  function updateSpaceField(spaceId, patch) {
    if (BUILTIN[spaceId]) {
      // allow logo/banner/rules/tags on builtin in session memory only via user spaces override
      const userSpaces = loadUserSpaces();
      userSpaces[spaceId] = { ...BUILTIN[spaceId], ...(userSpaces[spaceId] || {}), ...patch };
      saveUserSpaces(userSpaces);
    } else {
      const userSpaces = loadUserSpaces();
      if (!userSpaces[spaceId]) return;
      userSpaces[spaceId] = { ...userSpaces[spaceId], ...patch };
      saveUserSpaces(userSpaces);
    }
  }

  function switchSpace(id) {
    const spaceCheck = allSpaces()[id];
    if (spaceCheck && spaceCheck.adult18 && typeof window.orbyeCanEnterAdultSpace === "function") {
      const gate = window.orbyeCanEnterAdultSpace(spaceCheck);
      if (!gate.ok) {
        showToast(gate.reason || "Acceso bloqueado (18+)", "error");
        // stay on current or empty
        return;
      }
    }

    const spaces = allSpaces();
    if (!spaces[id]) return;
    currentSpace = id;
    const s = spaces[id];
    renderSpacesList();
  syncSpacesLoginBtn();

    if (feedTitle) feedTitle.textContent = s.name;
    const editBtn = document.getElementById("openEditSpaceBtn");
    const me = getUser();
    if (editBtn) {
      const canEdit = !!(me && (s.owner === me || (s.mods || []).includes(me) || localStorage.getItem("orbye_demo_role") === "admin"));
      editBtn.hidden = !canEdit;
      editBtn.style.display = canEdit ? "inline-block" : "none";
    }
    if (document.getElementById("feedVerifiedBadge")) {
      const sp = allSpaces()[currentSpace];
      document.getElementById("feedVerifiedBadge").hidden = !(sp && (sp.verified || sp.official));
    }
    if (feedDesc) {
      feedDesc.textContent = s.desc || s.about || "";
    }
    // User-claimable tags
    let claimBox = document.getElementById("spaceClaimTags");
    if (!claimBox) {
      const host = document.getElementById("feedCommTitle")?.parentElement;
      if (host) {
        claimBox = document.createElement("div");
        claimBox.id = "spaceClaimTags";
        claimBox.className = "space-claim-tags";
        host.appendChild(claimBox);
      }
    }
    if (claimBox) {
      const tagsList = s.tags || [];
      claimBox.innerHTML = tagsList.length
        ? "<small>Etiquetas:</small> " + tagsList.map(t =>
            `<button type="button" class="claim-tag-btn" data-tag="${esc(t)}">${esc(t)}</button>`
          ).join(" ")
        : "";
    }
    // 18+ banner mark
    const adultBadge = document.getElementById("spaceAdultBadge");
    if (adultBadge) { adultBadge.hidden = !s.adult18; adultBadge.style.display = s.adult18 ? 'inline-block' : 'none'; }

    if (aboutText) aboutText.textContent = s.about || s.desc || "Space de la comunidad.";
    // Top bar must show CURRENT space name (not always Void Drakes)
    const brand = document.querySelector(".vd-brand-text");
    if (brand) {
      brand.innerHTML = "ORBYE <b>SPACES</b>";
    }
    const verifiedBadge = document.getElementById("vdTopVerified");
    if (verifiedBadge) verifiedBadge.hidden = !s.verified;
    // Don't force Void Drakes — user-created spaces keep their own name in feed title

    if (feedBanner) {
      const icon = feedBanner.querySelector(".feed-comm-icon");
      if (icon) {
        if (s.logo) {
          icon.innerHTML = `<img src="${s.logo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
        } else {
          icon.textContent = s.icon || "🌌";
        }
      }
      const badge = feedBanner.querySelector(".vd-verified");
      if (badge) badge.style.display = s.verified ? "" : "none";
      if (s.banner) {
        feedBanner.style.backgroundImage = `linear-gradient(90deg,rgba(8,14,24,.92),rgba(8,14,24,.7)), url(${s.banner})`;
        feedBanner.style.backgroundSize = "cover";
        feedBanner.style.backgroundPosition = "center";
      } else {
        feedBanner.style.backgroundImage = "";
      }
    }

    // rules in about
    const rulesBox = document.getElementById("spaceRulesPublic");
    if (aboutText && aboutText.parentElement) {
      let rb = document.getElementById("spaceRulesPublic");
      if (!rb) {
        rb = document.createElement("div");
        rb.id = "spaceRulesPublic";
        rb.className = "space-rules-public";
        aboutText.parentElement.appendChild(rb);
      }
      if (s.rules && s.rules.length) {
        rb.innerHTML = "<b>Reglas</b><ul>" + s.rules.map(r => `<li>${esc(r)}</li>`).join("") + "</ul>";
      } else {
        rb.innerHTML = "";
      }
    }

    pendingMedia = null;
    renderPreview();
    if (textEl) {
      textEl.value = "";
      textEl.placeholder = `Publicar en ${s.name}...`;
    }
    renderModPanel(s);
    renderFeed();
    updateUI();
  }

  function renderPreview() {
    if (!preview) return;
    if (!pendingMedia) {
      preview.hidden = true;
      preview.innerHTML = "";
      return;
    }
    preview.hidden = false;
    if (pendingMedia.type === "video") {
      preview.innerHTML = `<video class="vd-preview-media" controls playsinline src="${pendingMedia.url}"></video>
        <button type="button" class="vd-remove-media" id="removePostMedia">Quitar</button>`;
    } else {
      preview.innerHTML = `<img class="vd-preview-media" src="${pendingMedia.url}" alt="">
        <button type="button" class="vd-remove-media" id="removePostMedia">Quitar</button>`;
    }
  }

  function renderFeed() {
    if (!feed) return;
    let posts = loadPosts(currentSpace).filter(p => !p.channel || p.channel === currentChannel || currentChannel === "general");
    // WallPass: boosted posts first
    posts = [...posts].sort((a, b) => {
      const scoreOf = (p) => {
        const t = p.wallpassTier || (p.wallpass ? "premium" : "");
        const boost = t === "ultimate" ? 40 : t === "premium" ? 20 : 0;
        return (p.views||0) + (p.likes||0)*4 + boost + (p.score || 0);
      };
      const sa = scoreOf(a);
      const sb = scoreOf(b);
      if (sb !== sa) return sb - sa;
      return b.ts - a.ts;
    });
    // register view for visible posts (once per session)
    posts.forEach(p => bumpPostView(p.id));
    if (postCountEl) postCountEl.textContent = String(posts.length);
    const s = allSpaces()[currentSpace];

    if (!posts.length) {
      feed.innerHTML = `<div class="vd-empty-posts">
        <div class="chat-empty-icon">${s?.icon || "🌌"}</div>
        <p>Sin publicaciones en ${esc(s?.name || "este Space")}</p>
        <p class="muted">Sé el primero en publicar. No hay posts falsos.</p>
      </div>`;
      return;
    }

    feed.innerHTML = posts.map(p => {
      const isMe = getUser() && p.user === getUser();
      const canDelete = isMe || isSpaceMod(s) || isModerator();
      let media = "";
      if (p.media) {
        media = p.media.type === "video"
          ? `<video class="vd-post-media" controls playsinline preload="metadata" src="${p.media.url}"></video>`
          : `<img class="vd-post-media ${p.media.type === "gif" ? "chat-gif" : ""}" src="${p.media.url}" alt="" loading="lazy">`;
      }
      const tier = p.wallpassTier || (p.wallpass ? "premium" : "");
      const boost = tier ? `<span class="wallpass-badge ${tier}">WallPass ${tier === "ultimate" ? "Ultimate" : "Premium"}</span>` : "";
      const comments = Array.isArray(p.comments) ? p.comments : [];
      const me = getUser();
      const liked = me && (p.likers || []).includes(me);
      const mediaType = p.media?.type || "";
      const commentsHtml = comments.map((c, ci) => {
        const cLiked = me && (c.likers || []).includes(me);
        const canDelC = me && (c.user === me || me === "DavidAvila" || (typeof window.orbyeIsGlobalMod === "function" && window.orbyeIsGlobalMod()));
        return `<div class="rd-comment" data-cid="${c.id || ci}">
          <button type="button" class="rd-c-vote ${cLiked ? "on" : ""}" data-like-comment="${p.id}" data-cid="${c.id || ci}" title="Like comentario">▲</button>
          <div class="rd-c-body">
            <b class="user-hit" data-user="${esc(c.user)}">${esc(c.user)}</b>
            <span class="muted">${formatTime(c.ts)}</span>
            ${c.text ? `<p>${linkify(c.text)}</p>` : ""}
            ${c.gif ? `<img class="rd-c-gif" src="${c.gif}" alt="gif" loading="lazy">` : ""}
            <small class="muted">${c.likes || 0} likes</small>
          </div>
        </div>`;
      }).join("");
      return `<article class="vd-post rd-post ${p.wallpass ? "boosted" : ""}" data-id="${p.id}">
        <div class="rd-vote-col">
          <button type="button" class="rd-vote-up ${liked ? "on" : ""}" data-like-post="${p.id}" title="Upvote">▲</button>
          <span class="rd-score">${(p.likes || 0) - (p.downvotes || 0)}</span>
          <button type="button" class="rd-vote-down" data-down-post="${p.id}" title="Downvote">▼</button>
        </div>
        <div class="rd-post-main">
          <div class="vd-post-meta">
            <button type="button" class="vd-post-avatar user-hit" data-user="${esc(p.user)}">${typeof window.orbyeAvatarHtml === "function" ? window.orbyeAvatarHtml(p.user) : esc((p.user||"?").charAt(0).toUpperCase())}</button>
            <div>
              <b class="user-hit" data-user="${esc(p.user)}" style="cursor:pointer">${esc(p.user)}${typeof window.orbyeModBadgeHtml==="function"?window.orbyeModBadgeHtml(p.user):""}</b>
              <span> · ${formatTime(p.ts)} · s/${esc(s?.name || currentSpace)}</span>
            </div>
            ${boost}
            ${canDelete ? `<button class="chat-del" data-del-post="${p.id}" title="Eliminar">×</button>` : ""}
          </div>
          ${p.text ? `<p class="vd-post-text">${linkify(p.text)}</p>` : ""}
          ${media}
          ${mediaType === "gif" ? `<span class="rd-gif-tag">GIF</span>` : ""}
          <div class="vd-post-foot rd-actions">
            <button type="button" class="ot-like-btn post-like ${liked ? "liked" : ""}" data-like-post="${p.id}">♥ <span>${p.likes || 0}</span></button>
            <button type="button" class="rd-action" data-toggle-comments="${p.id}">💬 ${comments.length} comentarios</button>
            <small class="muted">${p.views || 0} vistas</small>
          </div>
          <div class="rd-comments" id="comments-${p.id}" hidden>
            <div class="rd-comments-list">${commentsHtml || '<p class="muted">Sé el primero en comentar</p>'}</div>
            <div class="rd-comment-compose">
              <input type="text" class="rd-comment-input" data-comment-for="${p.id}" maxlength="400" placeholder="Añadir un comentario...">
              <button type="button" class="rd-comment-gif" data-comment-gif="${p.id}" title="GIF">GIF</button>
              <button type="button" class="button white rd-comment-send" data-comment-send="${p.id}">Comentar</button>
            </div>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  function updateUI() {
    /* exported below */
    const vdLogin = document.getElementById("vdLoginBtn");
    const _u = getUser();
    if (vdLogin) {
      vdLogin.hidden = !!_u;
      vdLogin.style.display = _u ? "none" : "";
    }

    const user = getUser();
    if (composerUser) {
      const wp = wallTier() ? " · WallPass " + wallTier() : (hasWallpass() ? " · WallPass" : "");
      composerUser.textContent = user ? `Publicando como ${user}${wp}` : "Inicia sesión para publicar";
    }
    if (note) {
      note.innerHTML = user
        ? `Conectado como <b>${esc(user)}</b>${wallTier() ? ' · <span class="wallpass-badge ' + wallTier() + '">WallPass ' + (wallTier()==='ultimate'?'Ultimate':'Premium') + '</span>' : ""}`
        : `Inicia sesión para publicar. <button type="button" id="openLoginFromPosts" class="link-btn">Iniciar sesión</button>`;
    }
    if (textEl) textEl.disabled = !user;
    if (publishBtn) publishBtn.disabled = !user;
    try { window.orbyeUpdatePostsUI = updateUI; } catch(e){}
    [emojiBtn, gifBtn, videoBtn].forEach(b => { if (b) b.disabled = !user; });
  }

  function sanitizePostLinks(text) {
    if (!text) return { text: text || "", blocked: [] };
    const blocked = [];
    // patrones sospechosos / no permitidos (juegos pirata, phishing, redes ajenas spam)
    const bad = [
      /\b(steamcommunity\.com\/gift|steamcommumity|stearncom|free-nitro|discordnitro)\b/i,
      /\b(bit\.ly|tinyurl\.com|t\.co)\/[A-Za-z0-9]+/i,
      /\b(porn|xxx|onlyfans)\b/i,
      /\b(crack|keygen|nulled|warez|piratebay)\b/i,
      /javascript:\s*/i,
      /data:text\/html/i
    ];
    let out = text;
    // extrae URLs
    out = out.replace(/https?:\/\/[^\s<>"']+/gi, (url) => {
      const lower = url.toLowerCase();
      for (const re of bad) {
        if (re.test(lower) || re.test(url)) {
          blocked.push(url);
          return "[enlace eliminado]";
        }
      }
      // permite http(s) normales
      return url;
    });
    // también revisa texto sin protocolo
    for (const re of bad) {
      if (re.test(out)) {
        out = out.replace(re, "[contenido bloqueado]");
        blocked.push("patrón bloqueado");
      }
    }
    return { text: out, blocked };
  }

  function publish() {
    const user = requireLogin();
    if (!user) return;
    let text = (textEl?.value || "").trim();
    if (!text && !pendingMedia) {
      showToast("Escribe algo o agrega un GIF/video.", "warn");
      return;
    }
    const safe = sanitizePostLinks(text);
    text = safe.text;
    if (safe.blocked.length) {
      showToast("Se eliminaron enlaces o texto no permitidos", "warn");
    }
    const posts = loadPosts(currentSpace);
    posts.unshift({
      id: crypto.randomUUID(),
      user,
      text,
      media: pendingMedia ? { ...pendingMedia } : null,
      ts: Date.now(),
      space: currentSpace,
      channel: currentChannel,
      wallpass: hasWallpass(), wallpassTier: wallTier() || (hasWallpass() ? "premium" : "")
    });
    if (posts.length > 100) posts.length = 100;
    if (!savePosts(currentSpace, posts)) return;
    // CLOUD_POST_PUSH
    const created = posts[0];
    if (window.orbyeCloud?.enabled && created) {
      window.orbyeCloud.createPost({
        author: user,
        body: text,
        spaceId: currentSpace,
        mediaUrl: created.media && created.media.url,
        mediaType: created.media && created.media.type
      }).then(row => {
        if (row && row.id) {
          created.cloudId = row.id;
          savePosts(currentSpace, posts);
          const badge = document.getElementById("orbye-cloud-badge");
          if (badge) badge.textContent = "☁ Post enviado";
        } else {
          const badge = document.getElementById("orbye-cloud-badge");
          if (badge) badge.textContent = "☁ Post no subió";
        }
      }).catch(() => {});
    }
    if (textEl) textEl.value = "";
    pendingMedia = null;
    renderPreview();
    renderFeed();
    showToast(hasWallpass() ? "Publicado con WallPass (más visibilidad)" : "Publicado", "ok");
  }

  window.orbyeSetPostGif = function(url, name) {
    pendingMedia = { type: "gif", url, name: name || "gif.gif" };
    renderPreview();
    showToast("GIF listo para publicar", "ok");
  };

  function handleMedia(file) {
    const user = requireLogin();
    if (!user || !file) return;
    const name = (file.name || "").toLowerCase();
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/.test(name);
    const isGif = file.type === "image/gif" || name.endsWith(".gif");
    const isImage = file.type.startsWith("image/") || isGif || /\.(png|jpe?g|webp)$/.test(name);
    if (!isVideo && !isImage && !isGif) {
      showToast("Solo imágenes, GIFs o videos.", "error");
      return;
    }
    const maxSize = isVideo ? 8 * 1024 * 1024 : 12 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("Archivo demasiado grande (máx. ~6–8 MB).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const type = isVideo ? "video" : (file.type === "image/gif" || file.type === "image/webp" || /\.(gif|webp)$/i.test(file.name || "") ? "gif" : "image");
      pendingMedia = { type, url: reader.result, name: file.name };
      renderPreview();
    };
    reader.readAsDataURL(file);
  }

  function readImageFile(file, cb) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Solo imágenes", "error");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast("Imagen máx. 3 MB", "error");
      return;
    }
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  }

  function openCreateSpace() {
    if (!requireLogin()) return;
    if (createModal) createModal.hidden = false;
    if (createSpaceMsg) createSpaceMsg.textContent = "";
  }

  function readFileDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      if (!file.type.startsWith("image/")) return resolve(null);
      if (file.size > 2.5 * 1024 * 1024) {
        showToast("Imagen muy grande (máx ~2.5 MB)", "warn");
        return resolve(null);
      }
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }

    document.getElementById("spaceLogoPick")?.addEventListener("click", () => document.getElementById("spaceLogoCreate")?.click());
  document.getElementById("spaceBannerPick")?.addEventListener("click", () => document.getElementById("spaceBannerCreate")?.click());
  document.getElementById("spaceLogoCreate")?.addEventListener("change", () => {
    const f = document.getElementById("spaceLogoCreate")?.files?.[0];
    const el = document.getElementById("spaceLogoName");
    if (el) el.textContent = f ? f.name : "Ningún archivo";
  });
  document.getElementById("spaceBannerCreate")?.addEventListener("change", () => {
    const f = document.getElementById("spaceBannerCreate")?.files?.[0];
    const el = document.getElementById("spaceBannerName");
    if (el) el.textContent = f ? f.name : "Ningún archivo";
  });

  async function createSpace() {
    const user = requireLogin();
    if (!user) return;
    const name = (spaceNameInput?.value || "").trim();
    const desc = (spaceDescInput?.value || "").trim();
    const icon = (spaceIconInput?.value || "🌌").trim().slice(0, 4) || "🌌";
    if (!name || name.length < 2) {
      if (createSpaceMsg) {
        createSpaceMsg.textContent = "Nombre mínimo 2 caracteres.";
        createSpaceMsg.style.color = "#f88";
      }
      return;
    }
    let id = slugify(name);
    if (allSpaces()[id]) id = id + "-" + Date.now().toString(36).slice(-4);
    const logoInput = document.getElementById("spaceLogoCreate");
    const bannerInput = document.getElementById("spaceBannerCreate");
    const logo = await readFileDataURL(logoInput?.files?.[0]);
    const banner = await readFileDataURL(bannerInput?.files?.[0]);
    const userSpaces = loadUserSpaces();
    userSpaces[id] = {
      id, name, icon,
      logo: logo || null,
      banner: banner || null,
      desc: desc || ("Comunidad de " + user),
      about: desc || ("Comunidad creada por " + user),
      verified: false,
      owner: user,
      mods: [user],
      rules: [],
      tags: [],
      adult18: false,
      createdAt: Date.now()
    };
    saveUserSpaces(userSpaces);
    if (createModal) createModal.hidden = true;
    if (spaceNameInput) spaceNameInput.value = "";
    if (spaceDescInput) spaceDescInput.value = "";
    if (logoInput) logoInput.value = "";
    if (bannerInput) bannerInput.value = "";
    showToast('Comunidad "' + name + '" creada', "ok");
    switchSpace(id);
  }

  // Events
  spacesList?.addEventListener("click", e => {
    const btn = e.target.closest("[data-space]");
    if (btn) switchSpace(btn.dataset.space);
  });

  document.querySelectorAll(".channel-item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".channel-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentChannel = btn.dataset.channel || "general";
      renderFeed();
      showToast("Canal #" + currentChannel, "info");
    });
  });

  createBtn?.addEventListener("click", openCreateSpace);
  closeCreate?.addEventListener("click", e => { e.preventDefault(); if (createModal) createModal.hidden = true; });
  createModal?.addEventListener("click", e => { if (e.target === createModal) createModal.hidden = true; });
  confirmCreate?.addEventListener("click", () => { createSpace(); });

  publishBtn?.addEventListener("click", publish);
  textEl?.addEventListener("focus", () => { if (!getUser()) { textEl.blur(); requireLogin(); } });

  emojiBtn?.addEventListener("click", () => {
    if (!requireLogin()) return;
    if (!emojiPicker) return;
    emojiPicker.hidden = !emojiPicker.hidden;
    if (!emojiPicker.hidden) {
      emojiPicker.innerHTML = EMOJIS.map(e => `<button type="button" class="emoji-item" data-emoji="${e}">${e}</button>`).join("");
    }
  });
  emojiPicker?.addEventListener("click", e => {
    const btn = e.target.closest("[data-emoji]");
    if (!btn || !textEl) return;
    const emoji = btn.dataset.emoji;
    const start = textEl.selectionStart || textEl.value.length;
    const end = textEl.selectionEnd || textEl.value.length;
    textEl.value = textEl.value.slice(0, start) + emoji + textEl.value.slice(end);
    textEl.focus();
    emojiPicker.hidden = true;
  });

  const postPick = document.getElementById("postMediaPickBtn");
  const postDrop = document.getElementById("postOrbyploadDrop");
  const postMediaName = document.getElementById("postMediaName");
  postPick?.addEventListener("click", () => mediaInput?.click());
  postDrop?.addEventListener("dragover", e => { e.preventDefault(); postDrop.classList.add("drag"); });
  postDrop?.addEventListener("dragleave", () => postDrop.classList.remove("drag"));
  postDrop?.addEventListener("drop", e => {
    e.preventDefault();
    postDrop.classList.remove("drag");
    const f = e.dataTransfer?.files?.[0];
    if (!f || !mediaInput) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    mediaInput.files = dt.files;
    if (postMediaName) postMediaName.textContent = f.name;
    mediaInput.dispatchEvent(new Event("change"));
  });
  mediaInput?.addEventListener("change", () => {
    const f = mediaInput.files?.[0];
    if (postMediaName) postMediaName.textContent = f ? f.name : "Ningún archivo";
  });

  gifBtn?.addEventListener("click", () => {
    if (!requireLogin()) return;
    if (typeof window.orbyeOpenGifPicker === "function") {
      window.orbyeOpenGifPicker("post", gifBtn);
      return;
    }
    mediaInput.accept = "image/gif,image/*,.gif";
    mediaInput.click();
  });
  videoBtn?.addEventListener("click", () => {
    if (!requireLogin()) return;
    mediaInput.accept = "video/*";
    mediaInput.click();
  });
  mediaInput?.addEventListener("change", () => {
    const f = mediaInput.files?.[0];
    if (f) handleMedia(f);
    mediaInput.value = "";
  });

  // Real views: 1 per logged-in user, forever (not per session spam)
  function bumpPostView(id) {
    const user = getUser();
    if (!user) return;
    let posts = loadPosts(currentSpace);
    const p = posts.find(x => x.id === id);
    if (!p) return;
    if (!Array.isArray(p.viewers)) p.viewers = [];
    if (p.user === user) { // author no cuenta
      p.views = p.viewers.filter(u => u !== p.user).length;
      savePosts(currentSpace, posts);
      return;
    }
    if (p.viewers.includes(user)) {
      p.views = p.viewers.filter(u => u !== p.user).length;
      savePosts(currentSpace, posts);
      return;
    }
    p.viewers.push(user);
    p.views = p.viewers.filter(u => u !== p.user).length;
    savePosts(currentSpace, posts);
  }

  let pendingCommentGif = {}; // postId -> url

  window.orbyeSetPostCommentGif = function(url) {
    // last opened comment target
    if (window._rdCommentGifFor) {
      pendingCommentGif[window._rdCommentGifFor] = url;
      showToast("GIF listo para el comentario", "ok");
    }
  };

  feed?.addEventListener("click", e => {
    const user = getUser();

    // Toggle like / upvote post (texto, gif, video)
    const likeBtn = e.target.closest("[data-like-post]");
    if (likeBtn) {
      if (!user) { requireLogin(); return; }
      const id = likeBtn.dataset.likePost;
      if (id === 'sys_how_to_spaces_v1') { showToast('Este mensaje del sistema no admite likes', 'info'); return; }
      let posts = loadPosts(currentSpace);
      const p = posts.find(x => x.id === id);
      if (!p) return;
      if (!p.likers) p.likers = [];
      if (p.likers.includes(user)) {
        p.likers = p.likers.filter(u => u !== user);
        p.likes = Math.max(0, (p.likes || 1) - 1);
        showToast("Like quitado", "info");
      } else {
        p.likers.push(user);
        p.likes = (p.likes || 0) + 1;
        if (p.downers) {
          p.downers = p.downers.filter(u => u !== user);
          p.downvotes = Math.max(0, (p.downvotes || 1) - 1);
        }
        if (typeof window.orbyeNotify === "function") {
          window.orbyeNotify(p.user, user + " dio like a tu post", "like", "#comunidad");
        }
      }
      p.score = (p.views || 0) + (p.likes || 0) * 4 - (p.downvotes || 0) * 2 + (p.wallpass ? 20 : 0);
      savePosts(currentSpace, posts);
      renderFeed();
      return;
    }

    // Downvote
    const downBtn = e.target.closest("[data-down-post]");
    if (downBtn) {
      if (!user) { requireLogin(); return; }
      const id = downBtn.dataset.downPost;
      let posts = loadPosts(currentSpace);
      const p = posts.find(x => x.id === id);
      if (!p) return;
      if (!p.downers) p.downers = [];
      if (p.downers.includes(user)) {
        p.downers = p.downers.filter(u => u !== user);
        p.downvotes = Math.max(0, (p.downvotes || 1) - 1);
      } else {
        p.downers.push(user);
        p.downvotes = (p.downvotes || 0) + 1;
        if (p.likers && p.likers.includes(user)) {
          p.likers = p.likers.filter(u => u !== user);
          p.likes = Math.max(0, (p.likes || 1) - 1);
        }
      }
      p.score = (p.views || 0) + (p.likes || 0) * 4 - (p.downvotes || 0) * 2 + (p.wallpass ? 20 : 0);
      savePosts(currentSpace, posts);
      renderFeed();
      return;
    }

    // Toggle comments panel
    const delC = e.target.closest("[data-del-post-comment]");
    if (delC) {
      e.preventDefault();
      const pid = delC.getAttribute("data-del-post-comment");
      const cid = delC.getAttribute("data-cid");
      const me = getUser();
      if (!me) return;
      const posts = loadPosts();
      const post = posts.find(x => x.id === pid);
      if (!post || !Array.isArray(post.comments)) return;
      const c = post.comments.find(x => String(x.id) === String(cid) || String(post.comments.indexOf(x)) === String(cid));
      const isMod = me === "DavidAvila" || (typeof window.orbyeIsGlobalMod === "function" && window.orbyeIsGlobalMod());
      if (!c || (c.user !== me && !isMod)) return;
      post.comments = post.comments.filter(x => String(x.id) !== String(cid));
      savePosts(posts);
      renderPosts();
      return;
    }

    const tog = e.target.closest("[data-toggle-comments]");
    if (tog) {
      const id = tog.dataset.toggleComments;
      const box = document.getElementById("comments-" + id);
      if (box) box.hidden = !box.hidden;
      return;
    }

    // GIF on comment
    const cgif = e.target.closest("[data-comment-gif]");
    if (cgif) {
      if (!user) { requireLogin(); return; }
      window._rdCommentGifFor = cgif.dataset.commentGif;
      if (typeof window.orbyeOpenGifPicker === "function") {
        window.orbyeOpenGifPicker("post", cgif);
        // bridge: when gif selected for post, also set comment gif if target set
        const prev = window.orbyeSetPostGif;
        window.orbyeSetPostGif = function(url, name) {
          if (window._rdCommentGifFor) {
            pendingCommentGif[window._rdCommentGifFor] = url;
            showToast("GIF añadido al comentario", "ok");
            window._rdCommentGifFor = null;
            if (prev) window.orbyeSetPostGif = prev;
            return;
          }
          if (prev) prev(url, name);
        };
      }
      return;
    }

    // Send comment
    const sendC = e.target.closest("[data-comment-send]");
    if (sendC) {
      if (!user) { requireLogin(); return; }
      const id = sendC.dataset.commentSend;
      const input = feed.querySelector(`[data-comment-for="${id}"]`);
      const text = (input?.value || "").trim();
      const gif = pendingCommentGif[id] || null;
      if (!text && !gif) {
        showToast("Escribe un comentario o añade GIF", "warn");
        return;
      }
      let posts = loadPosts(currentSpace);
      const p = posts.find(x => x.id === id);
      if (!p) return;
      if (!p.comments) p.comments = [];
      p.comments.push({
        id: crypto.randomUUID(),
        user,
        text,
        gif,
        likes: 0,
        likers: [],
        ts: Date.now()
      });
      delete pendingCommentGif[id];
      if (input) input.value = "";
      savePosts(currentSpace, posts);
      renderFeed();
      const box = document.getElementById("comments-" + id);
      if (box) box.hidden = false;
      if (typeof window.orbyeNotify === "function") {
        window.orbyeNotify(p.user, user + " comentó tu post", "comment", "#comunidad");
      }
      return;
    }

    // Like comment
    const likeC = e.target.closest("[data-like-comment]");
    if (likeC) {
      if (!user) { requireLogin(); return; }
      const pid = likeC.dataset.likeComment;
      const cid = likeC.dataset.cid;
      let posts = loadPosts(currentSpace);
      const p = posts.find(x => x.id === pid);
      if (!p || !p.comments) return;
      const c = p.comments.find(x => String(x.id) === String(cid)) || p.comments[Number(cid)];
      if (!c) return;
      if (!c.likers) c.likers = [];
      if (c.likers.includes(user)) {
        c.likers = c.likers.filter(u => u !== user);
        c.likes = Math.max(0, (c.likes || 1) - 1);
      } else {
        c.likers.push(user);
        c.likes = (c.likes || 0) + 1;
      }
      savePosts(currentSpace, posts);
      renderFeed();
      const box = document.getElementById("comments-" + pid);
      if (box) box.hidden = false;
      return;
    }

    const del = e.target.closest("[data-del-post]");
    if (!del) return;
    const id = del.dataset.delPost;
    let posts = loadPosts(currentSpace).filter(p => !p.channel || p.channel === currentChannel || currentChannel === "general");
    const post = posts.find(p => p.id === id);
    const s = allSpaces()[currentSpace];
    if (!post) return;
    if (post.user !== getUser() && !isSpaceMod(s) && !isModerator()) {
      showToast("No puedes eliminar esta publicación", "error");
      return;
    }
    posts = posts.filter(p => p.id !== id);
    savePosts(currentSpace, posts);
    renderFeed();
  });

  document.addEventListener("click", e => {
    if (e.target.id === "removePostMedia") { pendingMedia = null; renderPreview(); }
    if (e.target.id === "openLoginFromPosts") openLogin();
    if (e.target.id === "addRuleBtn") {
      const input = document.getElementById("newRuleInput");
      const val = (input?.value || "").trim();
      if (!val) return;
      const s = allSpaces()[currentSpace];
      if (!isSpaceMod(s)) return;
      const rules = [...(s.rules || []), val];
      updateSpaceField(currentSpace, { rules });
      if (input) input.value = "";
      switchSpace(currentSpace);
      showToast("Regla añadida", "ok");
    }
    
    if (e.target.id === "spaceAdult18" || e.target.closest("#spaceAdult18")) {
      const s = allSpaces()[currentSpace];
      if (!isSpaceMod(s)) return;
      const checked = document.getElementById("spaceAdult18")?.checked;
      updateSpaceField(currentSpace, { adult18: !!checked });
      showToast(checked ? "Space marcado 18+" : "Space ya no es 18+", "ok");
      switchSpace(currentSpace);
      return;
    }
    if (e.target.classList.contains("claim-tag-btn")) {
      const tag = e.target.dataset.tag;
      const me = getUser();
      if (!me || !tag) return;
      try {
        const KEY = "orbye_user_space_tags_v1";
        const all = JSON.parse(localStorage.getItem(KEY) || "{}");
        if (!all[me]) all[me] = {};
        if (!all[me][currentSpace]) all[me][currentSpace] = [];
        if (!all[me][currentSpace].includes(tag)) {
          all[me][currentSpace].push(tag);
          localStorage.setItem(KEY, JSON.stringify(all));
          showToast("Etiqueta aplicada: " + tag, "ok");
        } else {
          showToast("Ya tienes esa etiqueta", "info");
        }
        switchSpace(currentSpace);
      } catch {}
      return;
    }

    if (e.target.id === "addTagBtn") {
      const input = document.getElementById("newTagInput");
      const val = (input?.value || "").trim();
      if (!val) return;
      const s = allSpaces()[currentSpace];
      if (!isSpaceMod(s)) return;
      const tags = [...(s.tags || []), val];
      updateSpaceField(currentSpace, { tags });
      if (input) input.value = "";
      switchSpace(currentSpace);
      showToast("Etiqueta añadida", "ok");
    }
    const delRule = e.target.closest("[data-del-rule]");
    if (delRule) {
      const s = allSpaces()[currentSpace];
      if (!isSpaceMod(s)) return;
      const idx = Number(delRule.dataset.delRule);
      const rules = [...(s.rules || [])];
      rules.splice(idx, 1);
      updateSpaceField(currentSpace, { rules });
      switchSpace(currentSpace);
    }
    if (emojiPicker && !emojiPicker.hidden && !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
      emojiPicker.hidden = true;
    }
  });

  document.addEventListener("change", e => {
    if (e.target.id === "spaceLogoFile") {
      const s = allSpaces()[currentSpace];
      if (!isSpaceMod(s)) return;
      const f = e.target.files?.[0];
      readImageFile(f, url => {
        updateSpaceField(currentSpace, { logo: url });
        switchSpace(currentSpace);
        showToast("Logo actualizado", "ok");
      });
    }
    if (e.target.id === "spaceBannerFile") {
      const s = allSpaces()[currentSpace];
      if (!isSpaceMod(s)) return;
      const f = e.target.files?.[0];
      readImageFile(f, url => {
        updateSpaceField(currentSpace, { banner: url });
        switchSpace(currentSpace);
        showToast("Banner actualizado", "ok");
      });
    }
  });

  document.getElementById("vdLoginBtn")?.addEventListener("click", () => {
    document.getElementById("accountPanel").hidden = false;
  });
  // Force-hide Spaces login if already logged into OrbyE
  function syncSpacesLoginBtn() {
    const btn = document.getElementById("vdLoginBtn");
    const user = getUser();
    if (!btn) return;
    if (user) {
      btn.hidden = true;
      btn.style.display = "none";
      btn.setAttribute("aria-hidden", "true");
    } else {
      btn.hidden = false;
      btn.style.display = "";
      btn.removeAttribute("aria-hidden");
    }
  }
  window.addEventListener("orbye-login", () => { syncSpacesLoginBtn(); updateUI(); renderFeed(); switchSpace(currentSpace); });

  // NO seed/fake posts

  renderSpacesList();
  syncSpacesLoginBtn();
  const first = Object.keys(allSpaces())[0];
  if (first) switchSpace(first);
  else {
    renderSpacesList();
  syncSpacesLoginBtn();
    if (feedTitle) feedTitle.textContent = "Spaces";
    if (document.getElementById("feedVerifiedBadge")) {
      const sp = allSpaces()[currentSpace];
      document.getElementById("feedVerifiedBadge").hidden = !(sp && (sp.verified || sp.official));
    }
    if (feedDesc) feedDesc.textContent = "Crea tu primer Space con + Crear";
  }


  // --- Edit / delete Space (owner) ---
  const editModal = document.getElementById("editSpaceModal");
  document.getElementById("openEditSpaceBtn")?.addEventListener("click", () => {
    const s = allSpaces()[currentSpace];
    if (!s) return;
    const me = getUser();
    if (!me || (s.owner !== me && !(s.mods || []).includes(me) && localStorage.getItem("orbye_demo_role") !== "admin")) {
      showToast("Solo el creador puede editar", "error");
      return;
    }
    const n = document.getElementById("editSpaceName");
    const d = document.getElementById("editSpaceDesc");
    if (n) n.value = s.name || "";
    if (d) d.value = s.desc || s.about || "";
    const rulesEl = document.getElementById("editSpaceRules");
    const tagsEl = document.getElementById("editSpaceTags");
    const adultEl = document.getElementById("editSpaceAdult18");
    if (rulesEl) rulesEl.value = (s.rules || []).join("\n");
    if (tagsEl) tagsEl.value = (s.tags || []).join(", ");
    if (adultEl) adultEl.checked = !!s.adult18;
    if (editModal) {
      editModal.hidden = false;
      editModal.style.display = "flex";
    }
  });
  document.getElementById("closeEditSpace")?.addEventListener("click", () => {
    if (editModal) editModal.hidden = true;
  });
  editModal?.addEventListener("click", e => { if (e.target === editModal) editModal.hidden = true; });
  document.getElementById("editLogoPick")?.addEventListener("click", () => document.getElementById("editSpaceLogo")?.click());
  document.getElementById("editBannerPick")?.addEventListener("click", () => document.getElementById("editSpaceBanner")?.click());
  document.getElementById("editSpaceLogo")?.addEventListener("change", () => {
    const f = document.getElementById("editSpaceLogo")?.files?.[0];
    const el = document.getElementById("editLogoName");
    if (el) el.textContent = f ? f.name : "Cambiar logo";
  });
  document.getElementById("editSpaceBanner")?.addEventListener("change", () => {
    const f = document.getElementById("editSpaceBanner")?.files?.[0];
    const el = document.getElementById("editBannerName");
    if (el) el.textContent = f ? f.name : "Cambiar banner";
  });

  document.getElementById("saveEditSpace")?.addEventListener("click", async () => {
    const s = allSpaces()[currentSpace];
    if (!s) return;
    const me = getUser();
    if (!me || (s.owner !== me && localStorage.getItem("orbye_demo_role") !== "admin")) return;
    const name = (document.getElementById("editSpaceName")?.value || "").trim();
    const desc = (document.getElementById("editSpaceDesc")?.value || "").trim();
    if (!name) return;
    let logo = s.logo;
    let banner = s.banner;
    const lf = document.getElementById("editSpaceLogo")?.files?.[0];
    const bf = document.getElementById("editSpaceBanner")?.files?.[0];
    if (lf) logo = await readFileDataURL(lf);
    if (bf) banner = await readFileDataURL(bf);
    const rulesRaw = (document.getElementById("editSpaceRules")?.value || "").trim();
    const tagsRaw = (document.getElementById("editSpaceTags")?.value || "").trim();
    const adult18 = !!document.getElementById("editSpaceAdult18")?.checked;
    const color = document.getElementById("editSpaceColor")?.value || "#4a7adf";
    const topic = document.getElementById("editSpaceTopic")?.value || "general";
    const rules = rulesRaw ? rulesRaw.split(/\n+/).map(x => x.trim()).filter(Boolean) : [];
    const tags = tagsRaw ? tagsRaw.split(",").map(x => x.trim()).filter(Boolean) : [];
    updateSpaceField(currentSpace, {
      name,
      desc,
      about: desc,
      logo: logo || s.logo,
      banner: banner || s.banner,
      rules,
      tags,
      adult18
    });
    if (editModal) { editModal.hidden = true; editModal.style.display = "none"; }
    switchSpace(currentSpace);
    showToast("Space actualizado", "ok");
  });

  document.getElementById("deleteSpaceBtn")?.addEventListener("click", () => {
    const s = allSpaces()[currentSpace];
    if (!s) return;
    const me = getUser();
    if (!me || (s.owner !== me && localStorage.getItem("orbye_demo_role") !== "admin")) {
      showToast("Solo el creador puede eliminar", "error");
      return;
    }
    if (!confirm("¿Eliminar el Space \"" + s.name + "\"? No se puede deshacer.")) return;
    const userSpaces = loadUserSpaces();
    delete userSpaces[currentSpace];
    saveUserSpaces(userSpaces);
    // remove posts for space
    try {
      const posts = JSON.parse(localStorage.getItem("orbye_space_posts_v2") || "{}");
      delete posts[currentSpace];
      localStorage.setItem("orbye_space_posts_v2", JSON.stringify(posts));
    } catch {}
    if (editModal) editModal.hidden = true;
    currentSpace = "";
    renderSpacesList();
    const first = Object.keys(allSpaces())[0];
    if (first) switchSpace(first);
    else {
      if (feedTitle) feedTitle.textContent = "Spaces";
      if (document.getElementById("feedVerifiedBadge")) {
      const sp = allSpaces()[currentSpace];
      document.getElementById("feedVerifiedBadge").hidden = !(sp && (sp.verified || sp.official));
    }
    if (feedDesc) feedDesc.textContent = "Crea tu primer Space con + Crear";
      const feed = document.getElementById("postsFeed");
      if (feed) feed.innerHTML = "";
      const editBtn = document.getElementById("openEditSpaceBtn");
      if (editBtn) editBtn.hidden = true;
    }
    showToast("Space eliminado", "info");
  });

})();
// Cloud sync hooks
window.addEventListener("orbye-cloud-ready", async () => {
  if (!window.orbyeCloud?.enabled) return;
  try {
    const remote = await window.orbyeCloud.listPosts(80);
    if (remote.length && typeof window.orbyeMergeCloudPosts === "function") {
      window.orbyeMergeCloudPosts(remote);
    }
  } catch (e) { console.warn(e); }
});

// Reliable delete post / comment for author + mods + admin
document.addEventListener("click", e => {
  const me = localStorage.getItem("orbye_demo_user");
  const isAdm = (me || "").toLowerCase() === "davidavila";
  const delP = e.target.closest("[data-del-post], .post-del, .rd-del");
  if (delP) {
    e.preventDefault();
    e.stopPropagation();
    const id = delP.getAttribute("data-del-post") || delP.getAttribute("data-id") || delP.dataset.post;
    let list = [];
    try { list = JSON.parse(localStorage.getItem("orbye_posts_v1") || "[]"); } catch {}
    const post = list.find(p => String(p.id) === String(id));
    if (!post) return;
    if (post.user !== me && post.author !== me && !isAdm) return;
    if (!confirm("¿Eliminar este post?")) return;
    list = list.filter(p => String(p.id) !== String(id));
    localStorage.setItem("orbye_posts_v1", JSON.stringify(list));
    if (typeof window.renderPosts === "function") window.renderPosts();
    if (typeof window.orbyeRenderSpaceFeed === "function") window.orbyeRenderSpaceFeed();
    location.reload();
    return;
  }
  const delC = e.target.closest("[data-del-comment], .cmt-del");
  if (delC) {
    e.preventDefault();
    e.stopPropagation();
    const pid = delC.getAttribute("data-post") || delC.dataset.post;
    const cid = delC.getAttribute("data-del-comment") || delC.dataset.cid;
    let map = {};
    try { map = JSON.parse(localStorage.getItem("orbye_post_comments_v1") || "{}"); } catch {}
    const arr = map[pid] || [];
    const c = arr.find(x => String(x.id || x.ts) === String(cid));
    if (c && c.user !== me && !isAdm) return;
    map[pid] = arr.filter(x => String(x.id || x.ts) !== String(cid));
    localStorage.setItem("orbye_post_comments_v1", JSON.stringify(map));
    if (typeof window.renderPosts === "function") window.renderPosts();
    location.reload();
  }
}, true);

// Pull cloud posts into local spaces
window.orbyePullCloudPosts = async function() {
  if (!window.orbyeCloud?.enabled) return;
  try {
    const rows = await window.orbyeCloud.listPosts(80);
    if (!rows || !rows.length) return;
    const POSTS_KEY = "orbye_space_posts_v2";
    let all = {};
    try { all = JSON.parse(localStorage.getItem(POSTS_KEY) || "{}"); } catch { all = {}; }
    rows.forEach(r => {
      let body = r.body || "";
      let spaceId = r.space_id || "general";
      const sm = body.match(/^\[space:([^\]]+)\]\s*/);
      if (sm) {
        spaceId = sm[1];
        body = body.slice(sm[0].length);
      }
      all[spaceId] = all[spaceId] || [];
      const exists = all[spaceId].some(p => p.cloudId === r.id || p.id === r.id);
      if (exists) return;
      all[spaceId].unshift({
        id: r.id,
        cloudId: r.id,
        user: r.author_username,
        text: body,
        media: r.media_url ? { type: r.media_type || "image", url: r.media_url } : null,
        ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        space: spaceId
      });
    });
    localStorage.setItem(POSTS_KEY, JSON.stringify(all));
    if (typeof window.renderFeed === "function") window.renderFeed();
  } catch (e) { console.warn(e); }
};
window.addEventListener("orbye-cloud-ready", () => { window.orbyePullCloudPosts(); });
setInterval(() => { if (window.orbyePullCloudPosts) window.orbyePullCloudPosts(); }, 15000);

/* Spaces/public posts censor */
(function(){
  if (window.__orbyePostCensor) return;
  window.__orbyePostCensor = true;
  const old = window.orbyeCreatePost;
  if (typeof old === "function") {
    window.orbyeCreatePost = function(opts) {
      opts = opts || {};
      if (opts.body && window.orbyeCensorText) opts.body = window.orbyeCensorText(opts.body);
      if (opts.text && window.orbyeCensorText) opts.text = window.orbyeCensorText(opts.text);
      return old(opts);
    };
  }
})();

/* keep Spaces composer in sync with session */
(function(){
  function refresh(){ try { if (typeof window.orbyeUpdatePostsUI === "function") window.orbyeUpdatePostsUI(); } catch(e){} }
  window.addEventListener("orbye-login-ok", refresh);
  window.addEventListener("storage", function(e){
    if (!e.key || e.key.indexOf("orbye") >= 0) refresh();
  });
  setInterval(refresh, 2000);
  setTimeout(refresh, 300);
  setTimeout(refresh, 1500);
})();

window.orbyeForceSessionUI = function(){
  try {
    var u = (localStorage.getItem("orbye_demo_user")||"").trim();
    var el = document.getElementById("postComposerUser");
    var note = document.getElementById("postNote");
    var pub = document.getElementById("publishBtn") || document.querySelector("[data-publish], #postPublish");
    if (el) el.textContent = u ? ("Publicando como " + u) : "Inicia sesión para publicar";
    if (note && u) note.innerHTML = "Conectado como <b>"+u.replace(/</g,"")+"</b>";
    if (pub) pub.disabled = !u;
    document.querySelectorAll("#emojiBtn,#gifBtn,#videoBtn,.composer-tools button").forEach(function(b){ if(b) b.disabled = !u; });
  } catch(e){}
};
setInterval(function(){ window.orbyeForceSessionUI(); }, 1500);
window.addEventListener("orbye-login-ok", function(){ window.orbyeForceSessionUI(); });

/* Spaces posts → Supabase so friends see them */
(function(){
  function base(){ return (window.ORBYE_SUPABASE_URL||"").replace(/\/$/,""); }
  function key(){ return window.ORBYE_SUPABASE_ANON_KEY||window.__orbyeWorkingKey||""; }
  function headers(){
    const k=key();
    return { apikey:k, Authorization:"Bearer "+k, Accept:"application/json", "Content-Type":"application/json", Prefer:"return=minimal" };
  }
  window.orbyeSpacePostCloud = {
    async push(spaceId, post){
      if(!base()||!key()||!post) return false;
      // skip huge data-url media for REST body limits
      let mediaUrl = post.media && post.media.url;
      if(mediaUrl && String(mediaUrl).indexOf("data:")===0) mediaUrl = null;
      try{
        const res = await fetch(base()+"/rest/v1/orbye_space_posts", {
          method:"POST", headers:headers(),
          body: JSON.stringify([{
            id: post.id || ("p"+Date.now()),
            space_id: spaceId,
            author: post.user || post.author || "anon",
            body: post.text || post.body || "",
            media_url: mediaUrl,
            media_type: post.media && post.media.type,
            likes: post.likes||0,
            created_at: new Date(post.ts||Date.now()).toISOString()
          }])
        });
        return res.ok||res.status===201;
      }catch(e){ return false; }
    },
    async pull(spaceId){
      if(!base()||!key()) return null;
      try{
        const q = spaceId ? ("&space_id=eq."+encodeURIComponent(spaceId)) : "";
        const res = await fetch(base()+"/rest/v1/orbye_space_posts?select=*"+q+"&order=created_at.asc&limit=200", { headers:headers() });
        if(!res.ok) return null;
        return await res.json();
      }catch(e){ return null; }
    }
  };
  // Hook after local save: try to find savePosts
  const _save = window.savePosts;
  // poll merge into local
  async function mergeSpacePosts(){
    const rows = await window.orbyeSpacePostCloud.pull();
    if(!rows||!rows.length) return;
    try{
      const all = JSON.parse(localStorage.getItem("orbye_space_posts_v2")||"{}");
      rows.forEach(r=>{
        const sid = r.space_id;
        if(!all[sid]) all[sid]=[];
        if(all[sid].some(p=>p.id===r.id)) return;
        all[sid].push({
          id: r.id, user: r.author, text: r.body||"",
          media: r.media_url ? { type: r.media_type||"image", url: r.media_url } : null,
          ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
          likes: r.likes||0, likers: []
        });
      });
      localStorage.setItem("orbye_space_posts_v2", JSON.stringify(all));
      if(typeof window.renderFeed==="function") window.renderFeed();
    }catch(e){}
  }
  setInterval(mergeSpacePosts, 5000);
  setTimeout(mergeSpacePosts, 2000);
  // intercept publish by watching storage + button
  document.addEventListener("click", function(e){
    if(!e.target.closest("#postPublish")) return;
    setTimeout(function(){
      try{
        const space = localStorage.getItem("orbye_current_space")||"orby-help";
        const all = JSON.parse(localStorage.getItem("orbye_space_posts_v2")||"{}");
        const list = all[space]||[];
        const last = list[list.length-1] || list[0];
        if(last) window.orbyeSpacePostCloud.push(space, last);
      }catch(err){}
    }, 400);
  });
})();
