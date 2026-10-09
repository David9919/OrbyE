(() => {
  const DB_NAME = "orbye_orbytube_db";
  const DB_VER = 1;
  const STORE = "videos";
  const META_KEY = "orbye_orbytube_meta_v3";
  const statsKey = "orbye_orbytube_stats_v2";

  const grid = document.getElementById("movieGrid");
  const videoGrid = document.getElementById("otVideoGrid");
  const playerBlock = document.getElementById("otPlayerBlock");
  const upload = document.getElementById("movieUpload");
  const open = document.getElementById("openMovieUpload");
  const cancel = document.getElementById("cancelMovie");
  const save = document.getElementById("saveMovie");
  const title = document.getElementById("movieTitle");
  const descEl = document.getElementById("movieDesc");
  const file = document.getElementById("movieFile");
  const cover = document.getElementById("movieCover");
  const adultCheck = document.getElementById("movieAdult");
  const adultFilterToggle = document.getElementById("adultFilterToggle");
  const bgmInput = document.getElementById("movieBgm");
  const bgmVolume = document.getElementById("bgmVolume");
  const thumbCropBox = document.getElementById("thumbCropBox");
  const thumbCanvas = document.getElementById("thumbCanvas");
  const thumbZoom = document.getElementById("thumbZoom");
  const thumbApplyCrop = document.getElementById("thumbApplyCrop");
  const thumbPreview = document.getElementById("thumbPreview");
  const msg = document.getElementById("movieMessage");
  const player = document.getElementById("orbytubePlayer");
  const meta = document.getElementById("orbytubeMeta");
  const otTitle = document.getElementById("otTitle");
  const otDesc = document.getElementById("otDesc");
  const otBy = document.getElementById("otBy");
  const otStart = document.getElementById("otStartBtn");
  const otLike = document.getElementById("otLikeBtn");
  const otLikeCount = document.getElementById("otLikeCount");
  const otDownload = document.getElementById("otDownload");
  const otDelete = document.getElementById("otDelete");
  const otViews = document.getElementById("otViews");
  const otLikesStat = document.getElementById("otLikesStat");
  const otScore = document.getElementById("otScore");
  const otCreatorStats = document.getElementById("otCreatorStats");
  const otEngagement = document.getElementById("otEngagement");
  const accountPanel = document.getElementById("accountPanel");

  /** @type {{id:string,title:string,desc:string,fileName:string,uploader:string,ts:number,adult:boolean,cover:string|null}[]} */
  let videoMeta = [];
  let currentId = null;
  let viewTimer = null;
  let viewCounted = false;
  let objectUrls = {}; // id -> blob url
  let croppedCoverDataUrl = null;
      showStudioPreview(null);
  let thumbImg = null;
  let thumbOffset = { x: 0, y: 0 };
  let thumbDragging = false;
  let thumbLast = { x: 0, y: 0 };
  let currentBgmAudio = null;
  let otTab = "home";
  const HISTORY_KEY = "orbye_orbytube_history_v1";

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
  }
  function pushHistory(id) {
    let h = loadHistory().filter(x => x !== id);
    h.unshift(id);
    if (h.length > 50) h.length = 50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }
  function followingSet() {
    const me = getUser();
    if (!me) return new Set();
    try {
      const social = JSON.parse(localStorage.getItem("orbye_social_v1") || "{}");
      const node = social[me] || {};
      return new Set(node.following || []);
    } catch { return new Set(); }
  }

  function getUser() { return localStorage.getItem("orbye_demo_user") || null; }
  function isAdmin() { return localStorage.getItem("orbye_demo_role") === "admin"; }
  function isModerator() {
    const r = localStorage.getItem("orbye_demo_role");
    return r === "moderator" || r === "admin";
  }
  function wallTier() { return localStorage.getItem("orbye_wallpass_tier") || ""; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
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
    el._timer = setTimeout(() => el.classList.remove("show"), 3500);
  }

  function requireLogin() {
    const u = getUser();
    if (u) return u;
    if (accountPanel) accountPanel.hidden = false;
    showToast("Primero inicia sesión para subir videos a OrbyTube.", "warn");
    return null;
  }

  function canViewAdult() {
    if (typeof window.orbyeCanViewAdult === "function") return window.orbyeCanViewAdult();
    return false;
  }
  function showAdultAllowed() {
    return !!(adultFilterToggle && adultFilterToggle.checked && canViewAdult());
  }

  // ----- IndexedDB -----
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB error"));
    });
  }

  async function idbPut(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function loadMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || "[]"); } catch { return []; }
  }
  function saveMeta(list) {
    localStorage.setItem(META_KEY, JSON.stringify(list));
    try { /* DUAL_META_VELTX */ localStorage.setItem("orbye_veltx_meta_v1", JSON.stringify(list)); } catch (_) {}
  }

  function loadStats() {
    try { return JSON.parse(localStorage.getItem(statsKey) || "{}"); } catch { return {}; }
  }
  function saveStats(s) { localStorage.setItem(statsKey, JSON.stringify(s)); }
  function getStat(id) {
    const all = loadStats();
    if (!all[id]) all[id] = { views: 0, likes: 0, watchTicks: 0, uniqueLikers: [] };
    return all[id];
  }
  function computeScore(st) {
    const tier = wallTier();
    const boost = tier === "ultimate" ? 30 : tier === "premium" ? 12 : 0;
    return Math.round((st.views || 0) + (st.likes || 0) * 4 + Math.min(st.watchTicks || 0, 500) * 0.5 + boost);
  }
  function engagementRate(st) {
    if (!(st.views > 0)) return 0;
    return Math.min(100, Math.round(((st.likes || 0) / st.views) * 100));
  }

  function sortedByAlgorithm() {
    const stats = loadStats();
    return [...videoMeta].sort((a, b) =>
      computeScore(stats[b.id] || {}) - computeScore(stats[a.id] || {}) || (b.ts || 0) - (a.ts || 0)
    );
  }

  function filteredList() {
    let list = sortedByAlgorithm();
    const allowAdult = showAdultAllowed();
    list = list.filter(v => !v.adult || allowAdult);
    const me = getUser();
    if (otTab === "following") {
      const fol = followingSet();
      list = list.filter(v => fol.has(v.uploader));
    } else if (otTab === "history") {
      const order = loadHistory();
      const map = Object.fromEntries(list.map(v => [v.id, v]));
      list = order.map(id => map[id]).filter(Boolean);
    } else if (otTab === "mine") {
      list = list.filter(v => me && v.uploader === me);
    }
    return list;
  }

  function updateTabLabel() {
    const el = document.getElementById("otTabLabel");
    if (!el) return;
    el.textContent = {
      home: "Inicio · todos los videos",
      following: "Siguiendo · videos de gente que sigues",
      history: "Historial · lo que has visto",
      mine: "Mis videos · subidos por ti"
    }[otTab] || "Inicio";
  }

  function refreshCreatorBar() {
    const bar = document.getElementById("veltxCreatorBar");
    const user = getUser();
    if (!bar) return;
    if (!user) { bar.hidden = true; return; }
    const mine = videoMeta.filter(v => v.uploader === user);
    let views = 0, likes = 0;
    const all = loadStats();
    mine.forEach(v => {
      const st = all[v.id] || {};
      views += st.views || 0;
      likes += st.likes || 0;
    });
    bar.hidden = false;
    const n = document.getElementById("veltxCreatorName");
    const nv = document.getElementById("veltxMyVideos");
    const nviews = document.getElementById("veltxMyViews");
    const nl = document.getElementById("veltxMyLikes");
    if (n) n.textContent = user;
    if (nv) nv.textContent = String(mine.length);
    if (nviews) nviews.textContent = String(views);
    if (nl) nl.textContent = String(likes);
  }

  function renderList() {
    refreshCreatorBar();
    if (!grid) return;
    const list = filteredList();
    updateTabLabel();
    if (!list.length) {
      const hints = {
        home: "No hay videos visibles.<br>Pulsa Crear y sube un MP4.",
        following: "No hay videos de gente que sigues.<br>Sigue a creadores desde su perfil.",
        history: "Aún no hay historial.<br>Reproduce un video para registrarlo.",
        mine: "No has subido videos todavía."
      };
      grid.innerHTML = '<div class="ot-empty">' + (hints[otTab] || hints.home) + '</div>';
      return;
    }
    // YouTube-style home grid
    if (videoGrid) {
      videoGrid.innerHTML = list.map(v => {
        const st = getStat(v.id);
        const thumb = v.cover
          ? `<img src="${v.cover}" alt="">`
          : `<div class="ot-grid-ph">▶</div>`;
        const adultTag = v.adult ? '<span class="adult-tag">18+</span>' : '';
        return `<button type="button" class="ot-grid-card" data-id="${v.id}">
          <div class="ot-grid-thumb">${thumb}${adultTag}</div>
          <div class="ot-grid-meta">
            <div class="ot-grid-avatar">${typeof window.orbyeAvatarHtml === "function" ? window.orbyeAvatarHtml(v.uploader, "tiny") : ""}</div>
            <div>
              <b>${esc(v.title)}</b>
              <small class="user-hit" data-user="${esc(v.uploader)}">${esc(v.uploader)}</small>
              <small>♥ ${st.likes || 0}</small>
            </div>
          </div>
        </button>`;
      }).join("");
    }

    grid.innerHTML = list.map(v => {
      const st = getStat(v.id);
      const thumb = v.cover ? `<img src="${v.cover}" alt="">` : `<div class="ot-thumb-ph">▶</div>`;
      const adultTag = v.adult ? '<span class="adult-tag">18+</span>' : '';
      return `<button type="button" class="ot-item ${v.id === currentId ? "active" : ""}" data-id="${v.id}">
        <div class="ot-thumb">${thumb}${adultTag}</div>
        <div class="ot-item-info">
          <b>${esc(v.title)}</b>
          <small><span class="user-hit ot-uploader" data-user="${esc(v.uploader)}">${typeof window.orbyeAvatarHtml === "function" ? window.orbyeAvatarHtml(v.uploader, "tiny") : ""} ${esc(v.uploader)}</span> · ♥ ${st.likes || 0}</small>
        </div>
      </button>`;
    }).join("");
  }

  function updateStatsUI(id) {
    const st = getStat(id);
    const v = videoMeta.find(x => x.id === id);
    const isCreator = v && getUser() && v.uploader === getUser();
    // Views ONLY for creator
    const viewsEl = document.getElementById("otViews");
    const viewsWrap = viewsEl ? viewsEl.closest(".ot-stat") : null;
    if (viewsWrap) viewsWrap.hidden = !isCreator;
    if (otViews) otViews.textContent = String(st.views || 0);
    if (otLikesStat) otLikesStat.textContent = String(st.likes || 0);
    if (otLikeCount) otLikeCount.textContent = String(st.likes || 0);
    if (otLike) {
      const me = getUser();
      const liked = !!(me && (st.uniqueLikers || []).includes(me));
      otLike.classList.toggle("liked", liked);
      const ico = otLike.querySelector(".heart-ico");
      if (ico) ico.textContent = liked ? "♥" : "♡";
    }
    // Score only for creator
    const scoreEl = document.getElementById("otScore");
    const scoreWrap = scoreEl ? scoreEl.closest(".ot-stat") : null;
    if (scoreWrap) scoreWrap.hidden = !isCreator;
    if (otScore) otScore.textContent = String(computeScore(st));
    if (otCreatorStats) {
      otCreatorStats.hidden = !isCreator;
      if (isCreator && otEngagement) otEngagement.textContent = engagementRate(st) + "%";
    }
  }

  function registerView(id) {
    // 1 vista = 1 persona (cuenta iniciada). El dueño no cuenta su propia vista.
    const user = getUser();
    if (!user) return; // sin login no cuenta (evita anon basura)
    const all = loadStats();
    if (!all[id]) all[id] = { views: 0, likes: 0, watchTicks: 0, uniqueLikers: [], viewers: [] };
    if (!Array.isArray(all[id].viewers)) all[id].viewers = [];
    // Recontar vistas = número de viewers únicos (corrige inflados viejos)
    const v = all[id];
    const meta = (typeof loadAll === "function" ? null : null);
    let owner = null;
    try {
      const list = JSON.parse(localStorage.getItem("orbye_veltx_meta_v1") || "[]");
      const item = list.find(x => x.id === id);
      owner = item && (item.uploader || item.user);
    } catch (_) {}
    if (owner && user === owner) {
      // creador mirando su propia foto/video: no suma vista
      v.views = v.viewers.filter(u => u !== owner).length;
      saveStats(all);
      updateStatsUI(id);
      return;
    }
    if (v.viewers.includes(user)) {
      v.views = v.viewers.filter(u => u !== owner).length;
      saveStats(all);
      updateStatsUI(id);
      return;
    }
    v.viewers.push(user);
    v.views = v.viewers.filter(u => u !== owner).length;
    saveStats(all);
    updateStatsUI(id);
    renderList();
  }

  function registerWatchTick(id) {
    const all = loadStats();
    if (!all[id]) all[id] = { views: 0, likes: 0, watchTicks: 0, uniqueLikers: [] };
    all[id].watchTicks += 1;
    saveStats(all);
    updateStatsUI(id);
  }

  function stopViewTracking() {
    if (viewTimer) clearInterval(viewTimer);
    viewTimer = null;
    viewCounted = false;
  }

  function startViewTracking(id) {
    stopViewTracking();
    // PHOTO_VIEW_ONCE
    try {
      const list = JSON.parse(localStorage.getItem("orbye_veltx_meta_v1") || "[]");
      const item = list.find(x => x.id === id);
      if (item && item.isPhoto) {
        setTimeout(() => registerView(id), 800);
        return;
      }
    } catch (_) {}
    let elapsed = 0;
    viewTimer = setInterval(() => {
      const el = document.getElementById("otVideoEl");
      if (!el || el.paused || el.ended) return;
      elapsed += 1;
      registerWatchTick(id);
      if (!viewCounted && elapsed >= 3) {
        viewCounted = true;
        registerView(id);
      }
    }, 1000);
  }

  async function resolveBlobUrl(id) {
    if (objectUrls[id]) return objectUrls[id];
    const rec = await idbGet(id);
    if (!rec || !rec.blob) return null;
    const url = URL.createObjectURL(rec.blob);
    objectUrls[id] = url;
    return url;
  }

  async function selectVideo(id) {
    window.__otCurrentId = id;
    currentId = id;
    const cPanel = document.getElementById("otCommentsPanel");
    if (cPanel) cPanel.dataset.videoId = id;
    const v = videoMeta.find(x => x.id === id);
    if (!v || !player) return;
    if (v.adult && !showAdultAllowed()) {
      showToast("Contenido Adult Content. Actívalo en tu perfil (mayor de edad).", "warn");
      return;
    }
    stopViewTracking();
    currentId = id;

    if (msg) msg.textContent = "";
    player.classList.remove("empty");
    player.innerHTML = `<div class="ot-placeholder"><span>…</span><p>Cargando video…</p></div>`;

    try {
      const url = await resolveBlobUrl(id);
      if (!url) {
        player.innerHTML = `<div class="ot-placeholder"><span>!</span><p>No se encontró el archivo del video.</p></div>`;
        showToast("Video no encontrado en el almacenamiento", "error");
        return;
      }
      stopBgm();
      const posterAttr = v.cover ? ` poster="${v.cover}"` : "";
      // Overlay starts HIDDEN — only appears when user pauses
      if (v.isPhoto) {
        player.innerHTML = `<div class="ot-player-wrap ot-photo-wrap">
          <img id="otPhotoEl" class="ot-photo-el" src="${url}" alt="${esc(v.title || "Foto")}">
        </div>`;
      } else {
        player.innerHTML = `<div class="ot-player-wrap">
          <video id="otVideoEl" controls playsinline src="${url}"${posterAttr}></video>
          <div id="otPosterOverlay" class="ot-poster-overlay" hidden>
            ${v.cover ? `<img src="${v.cover}" alt="">` : ""}
            <button type="button" class="ot-poster-play" id="otPosterPlay">▶</button>
          </div>
        </div>`;
      }
      if (meta) meta.hidden = false;
      if (otTitle) otTitle.textContent = v.title + (v.isPhoto ? " · 📷" : "") + (v.isClip ? " · Clip" : "") + (v.hasBgm ? " · 🎵" : "");
      if (otDesc) otDesc.textContent = v.desc || "Sin descripción";
      if (otBy) {
        otBy.innerHTML = "Por <button type=\"button\" class=\"user-hit ot-by-btn\" data-user=\"" + esc(v.uploader) + "\">" +
          (typeof window.orbyeAvatarHtml === "function" ? window.orbyeAvatarHtml(v.uploader, "tiny") : "") +
          " " + esc(v.uploader) + "</button>";
      }
      if (otDownload) {
        otDownload.href = url;
        otDownload.download = v.fileName || (v.title + (v.isPhoto ? ".jpg" : ".mp4"));
      }
      if (otDelete) otDelete.hidden = !(isModerator() || (getUser() && v.uploader === getUser()));
      updateStatsUI(id);
      renderList();
      pushHistory(id);
      if (typeof window.orbyeRenderComments === "function") window.orbyeRenderComments(id);
      if (playerBlock) { playerBlock.hidden = false; playerBlock.style.display = ""; }
      if (videoGrid) videoGrid.hidden = true;
      if (document.getElementById("otSideList")) document.getElementById("otSideList").hidden = false;
      const el = document.getElementById("otVideoEl");
    const photoEl = document.getElementById("otPhotoEl");
    // photo mode toggle if metadata says photo
    try {
      const metaV = videoMeta.find(x => x.id === currentId || x.id === id);
      if (metaV && metaV.isPhoto && photoEl) {
        if (el) el.hidden = true;
        photoEl.hidden = false;
      } else if (photoEl) {
        photoEl.hidden = true;
        if (el) el.hidden = false;
      }
    } catch(_){}
      const overlay = document.getElementById("otPosterOverlay");
      let hasStarted = false;
      const showOverlay = () => {
        // Only show thumbnail overlay if video already started and is paused/ended
        if (overlay && v.cover && hasStarted) {
          overlay.hidden = false;
        }
      };
      const hideOverlay = () => {
        if (overlay) overlay.hidden = true;
      };
      if (el) {
        // Never cover the video on first load — user sees the video player
        hideOverlay();
        el.addEventListener("playing", () => {
          hasStarted = true;
          hideOverlay();
        });
        el.addEventListener("play", async () => {
          hasStarted = true;
          hideOverlay();
          const vidEl = player.querySelector("video");
      if (vidEl) {
        if (v.speed) vidEl.playbackRate = Number(v.speed) || 1;
        if (v.trimStart) {
          vidEl.addEventListener("loadedmetadata", () => {
            try { vidEl.currentTime = Number(v.trimStart) || 0; } catch {}
          }, { once: true });
        }
        if (v.trimEnd) {
          vidEl.addEventListener("timeupdate", () => {
            if (v.trimEnd && vidEl.currentTime >= Number(v.trimEnd)) {
              vidEl.pause();
            }
          });
        }
        const filters = {
          none: "",
          warm: "sepia(0.25) saturate(1.2)",
          cool: "hue-rotate(30deg) saturate(1.1)",
          mono: "grayscale(1)",
          vivid: "contrast(1.15) saturate(1.4)"
        };
        vidEl.style.filter = filters[v.filter] || "";
      }
      // caption overlay
      if (v.caption) {
        let cap = player.querySelector(".veltx-caption");
        if (!cap) {
          cap = document.createElement("div");
          cap.className = "veltx-caption";
          player.appendChild(cap);
        }
        cap.textContent = v.caption;
        const cx = v.captionX != null ? v.captionX : 50;
        const cy = v.captionY != null ? v.captionY : 80;
        cap.style.left = cx + "%";
        cap.style.top = cy + "%";
        cap.style.bottom = "auto";
        const rot = v.captionRot || 0;
        const col = v.captionColor || "#ffffff";
        cap.style.color = col;
      cap.style.opacity = String(opac);
        cap.style.transform = "translate(-50%, -50%) rotate(" + rot + "deg)";
      }
      // Veltx Clip layout
      if (v.isClip) player.classList.add("veltx-clip-player");
      else player.classList.remove("veltx-clip-player");
      startViewTracking(id);
          try {
            const rec = await idbGet(id);
            if (rec && rec.bgm) {
              stopBgm();
              const bgmUrl = URL.createObjectURL(rec.bgm);
              currentBgmAudio = new Audio(bgmUrl);
              currentBgmAudio.loop = true;
              currentBgmAudio.volume = typeof rec.bgmVolume === "number" ? rec.bgmVolume : 0.35;
              currentBgmAudio.play().catch(() => {});
            }
          } catch (_) {}
        });
        el.addEventListener("pause", () => {
          if (currentBgmAudio) currentBgmAudio.pause();
          // paused mid-watch → show thumbnail
          if (hasStarted && !el.ended) showOverlay();
          else if (el.ended) showOverlay();
        });
        el.addEventListener("ended", () => {
          stopBgm();
          hasStarted = true;
          showOverlay();
        });
        document.getElementById("otPosterPlay")?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          hideOverlay();
          el.play().catch(() => {});
        });
      }
    } catch (e) {
      player.innerHTML = `<div class="ot-placeholder"><span>!</span><p>Error al cargar el video.</p></div>`;
      showToast("Error al cargar el video", "error");
    }
  }


  function captureVideoFrame(file, seekTime = 0.5) {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.src = url;
        const cleanup = () => {
          try { URL.revokeObjectURL(url); } catch (_) {}
        };
        const fail = () => { cleanup(); resolve(null); };
        video.addEventListener("error", fail);
        video.addEventListener("loadeddata", () => {
          const t = Math.min(seekTime, Math.max(0.1, (video.duration || 1) * 0.1));
          const onSeeked = () => {
            try {
              const w = video.videoWidth || 320;
              const h = video.videoHeight || 180;
              if (!w || !h) { fail(); return; }
              const canvas = document.createElement("canvas");
              // max width 480 for storage
              const scale = Math.min(1, 480 / w);
              canvas.width = Math.round(w * scale);
              canvas.height = Math.round(h * scale);
              const ctx = canvas.getContext("2d");
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const data = canvas.toDataURL("image/jpeg", 0.82);
              cleanup();
              resolve(data);
            } catch (_) {
              fail();
            }
          };
          video.addEventListener("seeked", onSeeked, { once: true });
          try {
            video.currentTime = t;
          } catch (_) {
            // some browsers need play briefly
            video.play().then(() => {
              video.pause();
              video.currentTime = t;
            }).catch(fail);
          }
        }, { once: true });
      } catch (_) {
        resolve(null);
      }
    });
  }

  function readImageAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("No se pudo leer la imagen"));
      r.readAsDataURL(file);
    });
  }


  function drawThumb() {
    if (!thumbCanvas || !thumbImg) return;
    const ctx = thumbCanvas.getContext("2d");
    const cw = thumbCanvas.width;
    const ch = thumbCanvas.height;
    const zoom = (Number(thumbZoom?.value) || 100) / 100;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, cw, ch);
    const scale = Math.max(cw / thumbImg.width, ch / thumbImg.height) * zoom;
    const w = thumbImg.width * scale;
    const h = thumbImg.height * scale;
    // clamp offsets
    const minX = cw - w;
    const minY = ch - h;
    thumbOffset.x = Math.min(0, Math.max(minX, thumbOffset.x));
    thumbOffset.y = Math.min(0, Math.max(minY, thumbOffset.y));
    ctx.drawImage(thumbImg, thumbOffset.x, thumbOffset.y, w, h);
  }

  function loadThumbForCrop(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      thumbImg = img;
      thumbOffset = { x: 0, y: 0 };
      if (thumbZoom) thumbZoom.value = 100;
      if (thumbCropBox) thumbCropBox.hidden = false;
      croppedCoverDataUrl = null;
      showStudioPreview(null);
      if (thumbPreview) { thumbPreview.hidden = true; thumbPreview.src = ""; }
      drawThumb();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  cover?.addEventListener("change", () => {
    const f = cover.files?.[0];
    if (f) loadThumbForCrop(f);
  });

  thumbZoom?.addEventListener("input", drawThumb);

  if (thumbCanvas) {
    thumbCanvas.addEventListener("pointerdown", e => {
      thumbDragging = true;
      thumbLast = { x: e.clientX, y: e.clientY };
      thumbCanvas.setPointerCapture(e.pointerId);
    });
    thumbCanvas.addEventListener("pointermove", e => {
      if (!thumbDragging) return;
      thumbOffset.x += e.clientX - thumbLast.x;
      thumbOffset.y += e.clientY - thumbLast.y;
      thumbLast = { x: e.clientX, y: e.clientY };
      drawThumb();
    });
    thumbCanvas.addEventListener("pointerup", () => { thumbDragging = false; });
    thumbCanvas.addEventListener("pointercancel", () => { thumbDragging = false; });
  }

  thumbApplyCrop?.addEventListener("click", () => {
    if (!thumbCanvas) return;
    drawThumb();
    croppedCoverDataUrl = thumbCanvas.toDataURL("image/jpeg", 0.85);
    if (thumbPreview) {
      thumbPreview.src = croppedCoverDataUrl;
      thumbPreview.hidden = false;
    }
    showToast("Miniatura recortada", "ok");
  });

  function stopBgm() {
    if (currentBgmAudio) {
      try { currentBgmAudio.pause(); } catch (_) {}
      currentBgmAudio = null;
    }
  }


  const viewHome = document.getElementById("otViewHome");
  const viewCreate = document.getElementById("otViewCreate");
  const fab = document.getElementById("openMovieUpload");

  function showOtHome() {
    if (viewHome) viewHome.hidden = false;
    if (viewCreate) viewCreate.hidden = true;
    if (fab) fab.hidden = false;
    if (playerBlock) playerBlock.hidden = true;
    if (videoGrid) videoGrid.hidden = false;
  }
  function showOtCreate() {
    if (viewHome) viewHome.hidden = true;
    if (viewCreate) viewCreate.hidden = false;
    if (fab) fab.hidden = true;
    viewCreate?.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  // OrbyPload custom UI
  const dropZone = document.getElementById("orbyploadDrop");
  const playBtn = document.getElementById("orbyploadPlayBtn");
  const fileNameEl = document.getElementById("orbyploadFileName");
  const coverBtn = document.getElementById("orbyploadCoverBtn");
  const bgmBtn = document.getElementById("orbyploadBgmBtn");
  const extraEl = document.getElementById("orbyploadExtra");

  function setFileLabel(name) {
    if (fileNameEl) fileNameEl.textContent = name || "Ningún archivo seleccionado";
  }

  playBtn?.addEventListener("click", () => file?.click());
  dropZone?.addEventListener("click", e => {
    if (e.target.closest(".orbypload-play") || e.target === dropZone || e.target.classList.contains("orbypload-sub") || e.target.classList.contains("orbypload-title")) {
      file?.click();
    }
  });
  dropZone?.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag"); });
  dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
  dropZone?.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag");
    const f = e.dataTransfer?.files?.[0];
    if (!f || !file) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    file.files = dt.files;
    setFileLabel(f.name);
    showStudioPreview(f);
    file.dispatchEvent(new Event("change"));
  });
  function showStudioPreview(f) {
    const prev = document.getElementById("studioVideoPreview");
    const wrap = document.getElementById("studioPreviewWrap");
    let imgPrev = document.getElementById("studioImagePreview");
    if (!imgPrev && wrap) {
      imgPrev = document.createElement("img");
      imgPrev.id = "studioImagePreview";
      imgPrev.className = "studio-image-preview";
      imgPrev.hidden = true;
      wrap.appendChild(imgPrev);
    }
    if (!prev) return;
    if (prev._url) {
      try { URL.revokeObjectURL(prev._url); } catch {}
      prev._url = null;
    }
    if (!f) {
      if (wrap) wrap.hidden = true;
      prev.hidden = true;
      prev.removeAttribute("src");
      try { prev.load(); } catch {}
      if (imgPrev) { imgPrev.hidden = true; imgPrev.removeAttribute("src"); }
      return;
    }
    const url = URL.createObjectURL(f);
    prev._url = url;
    if (wrap) wrap.hidden = false;
    if (f.type.startsWith("image/")) {
      prev.hidden = true;
      prev.removeAttribute("src");
      if (imgPrev) {
        imgPrev.hidden = false;
        imgPrev.src = url;
      }
    } else {
      if (imgPrev) { imgPrev.hidden = true; imgPrev.removeAttribute("src"); }
      prev.hidden = false;
      prev.src = url;
      prev.muted = true;
      prev.play().catch(() => {});
    }
    syncStudioCaption();
  }

  function syncStudioCaption() {
    const input = document.getElementById("movieCaption");
    const drag = document.getElementById("studioCaptionDrag");
    const xEl = document.getElementById("movieCaptionX");
    const yEl = document.getElementById("movieCaptionY");
    const col = document.getElementById("movieCaptionColor")?.value || "#ffffff";
    const rot = Number(document.getElementById("movieCaptionRot")?.value || 0);
    const opac = Number(document.getElementById("movieCaptionOpac")?.value || 100) / 100;
    const rotVal = document.getElementById("movieCaptionRotVal");
    const opacEl = document.getElementById("movieCaptionOpac");
    const opacVal = document.getElementById("movieCaptionOpacVal");
    if (opacVal && opacEl) opacVal.textContent = (opacEl.value || 100) + "%";
    if (rotVal) rotVal.textContent = rot + "°";
    if (!drag) return;
    const t = (input?.value || "").trim();
    if (!t) {
      drag.hidden = true;
      return;
    }
    drag.hidden = false;
    drag.textContent = t;
    const x = Number(xEl?.value || 50);
    const y = Number(yEl?.value || 80);
    drag.style.left = x + "%";
    drag.style.top = y + "%";
    drag.style.color = col;
    drag.style.opacity = String(opac);
    drag.style.transform = "translate(-50%, -50%) rotate(" + rot + "deg)";
    drag.style.display = "block";
    drag.style.pointerEvents = "auto";
  }

  // Drag caption on preview
  (function initCaptionDrag() {
    const drag = () => document.getElementById("studioCaptionDrag");
    const layer = () => document.getElementById("studioCaptionLayer");
    let state = null;
    document.addEventListener("pointerdown", e => {
      const el = e.target.closest("#studioCaptionDrag");
      if (!el) return;
      const lay = layer();
      if (!lay) return;
      const r = lay.getBoundingClientRect();
      state = { el };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    document.addEventListener("pointermove", e => {
      if (!state) return;
      const lay = layer();
      const el = state.el;
      if (!lay || !el) return;
      const r = lay.getBoundingClientRect();
      let x = ((e.clientX - r.left) / r.width) * 100;
      let y = ((e.clientY - r.top) / r.height) * 100;
      x = Math.max(5, Math.min(95, x));
      y = Math.max(5, Math.min(95, y));
      el.style.left = x + "%";
      el.style.top = y + "%";
      const xEl = document.getElementById("movieCaptionX");
      const yEl = document.getElementById("movieCaptionY");
      if (xEl) xEl.value = String(Math.round(x * 10) / 10);
      if (yEl) yEl.value = String(Math.round(y * 10) / 10);
    });
    document.addEventListener("pointerup", () => { state = null; });
    document.getElementById("movieCaption")?.addEventListener("input", syncStudioCaption);
    document.getElementById("movieCaptionColor")?.addEventListener("input", syncStudioCaption);
    document.getElementById("movieCaptionRot")?.addEventListener("input", syncStudioCaption);
    document.getElementById("movieCaptionOpac")?.addEventListener("input", syncStudioCaption);
  })();

  file?.addEventListener("change", () => {
    const f = file.files?.[0];
    setFileLabel(f ? f.name : "Ningún archivo seleccionado");
    showStudioPreview(f || null);
  });
  coverBtn?.addEventListener("click", () => cover?.click());
  bgmBtn?.addEventListener("click", () => bgmInput?.click());
  cover?.addEventListener("change", () => {
    if (extraEl && cover.files?.[0]) extraEl.textContent = "Miniatura: " + cover.files[0].name;
  });
  bgmInput?.addEventListener("change", () => {
    if (extraEl && bgmInput.files?.[0]) extraEl.textContent = (extraEl.textContent ? extraEl.textContent + " · " : "") + "Audio: " + bgmInput.files[0].name;
  });

  open?.addEventListener("click", () => {
    if (!requireLogin()) return;
    showOtCreate();
  });
  cancel?.addEventListener("click", () => { showOtHome(); });
  document.getElementById("otBackHome")?.addEventListener("click", () => { showOtHome(); });

  save?.addEventListener("click", async () => {
    const user = requireLogin();
    if (!user) return;

    const t = (title?.value || "").trim();
    const d = (descEl?.value || "").trim();
    const f = file?.files?.[0];
    const c = cover?.files?.[0];

    if (!t) {
      if (msg) msg.textContent = "Escribe un título.";
      showToast("Escribe un título", "warn");
      return;
    }
    if (!f) {
      if (msg) msg.textContent = "Elige un archivo de video (MP4, WebM, MOV…).";
      showToast("Elige un video", "warn");
      return;
    }

    const okVidExt = /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg|3gp|mpe|ts|mts|m2ts|flv|wmv|asf|vob|mp5|f4v|rm|rmvb)$/i.test(f.name || "");
    const okImgExt = /\.(png|jpe?g|gif|webp|bmp|heic|avif)$/i.test(f.name || "");
    const looksVideo = (f.type && f.type.startsWith("video/")) || okVidExt;
    const looksImage = (f.type && f.type.startsWith("image/")) || okImgExt;
    if (!looksVideo && !looksImage) {
      // último recurso: dejar pasar archivos grandes (posible video sin extensión)
      if (f.size < 50 * 1024) {
        if (msg) msg.textContent = "No se reconoce el archivo. Usa MP4, WebM, MOV u otra extensión de video.";
        showToast("Formato no reconocido", "error");
        return;
      }
    }
    // Si es imagen → modo foto automático
    if (looksImage && !looksVideo) {
      const clipEl = document.getElementById("movieClipMode");
      // mark for isPhoto downstream
      window.__orbyeForcePhoto = true;
    } else {
      window.__orbyeForcePhoto = false;
    }

    // IndexedDB can handle much larger files than localStorage
    const maxBytes = 80 * 1024 * 1024; // 80 MB
    if (f.size > maxBytes) {
      if (msg) msg.textContent = "Video demasiado grande (máx. 80 MB en esta versión).";
      showToast("Máximo 80 MB", "error");
      return;
    }

    // Duración máx. 3 horas (10800s) — 13h es demasiado
    const MAX_DURATION = 3 * 60 * 60;
    try {
      const dur = await new Promise((resolve) => {
        const u = URL.createObjectURL(f);
        const v = document.createElement("video");
        v.preload = "metadata";
        v.src = u;
        v.onloadedmetadata = () => { URL.revokeObjectURL(u); resolve(v.duration || 0); };
        v.onerror = () => { URL.revokeObjectURL(u); resolve(0); };
      });
      if (dur > MAX_DURATION) {
        if (msg) msg.textContent = "El video supera 3 horas. Sube uno más corto.";
        showToast("Máximo 3 horas", "error");
        return;
      }
    } catch (_) {}

    if (msg) msg.textContent = "Subiendo video… esto puede tardar unos segundos.";
    if (save) save.disabled = true;

    try {
      let coverUrl = croppedCoverDataUrl;
      if (!coverUrl && c) {
        if (c.size > 2 * 1024 * 1024) {
          showToast("Miniatura muy grande, se omite", "warn");
        } else {
          coverUrl = await readImageAsDataURL(c);
        }
      }
      // Si no hay miniatura, captura un fotograma del video (inicio)
      if (!coverUrl) {
        if (msg) msg.textContent = "Generando miniatura del video…";
        coverUrl = await captureVideoFrame(f, 0.8);
      }

      const id = crypto.randomUUID();
      const bgmFile = bgmInput?.files?.[0] || null;
      // Store binary blob in IndexedDB (NOT base64 in localStorage)
      await idbPut({
        id,
        blob: f,
        type: f.type || "video/mp4",
        name: f.name,
        bgm: bgmFile || null,
        bgmType: bgmFile ? (bgmFile.type || "audio/mpeg") : null,
        bgmVolume: Number(bgmVolume?.value || 35) / 100
      });

      const vis = document.getElementById("movieVisibility")?.value || "public";
      const cat = document.getElementById("movieCategory")?.value || "general";
      const tagsRaw = (document.getElementById("movieTags")?.value || "").trim();
      const tags = tagsRaw ? tagsRaw.split(",").map(x => x.trim()).filter(Boolean) : [];
      const hashtagsRaw = (document.getElementById("movieHashtags")?.value || "").trim();
      const hashtags = hashtagsRaw ? hashtagsRaw.split(/\s+/).filter(Boolean) : [];
      const caption = (document.getElementById("movieCaption")?.value || "").trim().slice(0, 80);
      const captionX = Number(document.getElementById("movieCaptionX")?.value || 50);
      const captionY = Number(document.getElementById("movieCaptionY")?.value || 80);
      const captionColor = document.getElementById("movieCaptionColor")?.value || "#ffffff";
      const captionRot = Number(document.getElementById("movieCaptionRot")?.value || 0);
      const isClip = !!document.getElementById("movieClipMode")?.checked;
      const isPhotoForce = !!window.__orbyeForcePhoto;
      const fileEl = document.getElementById("movieFile");
      const picked = fileEl && fileEl.files && fileEl.files[0];
      const isPhoto = !!(picked && picked.type && picked.type.startsWith("image/"));
      const trimStart = Math.max(0, Number(document.getElementById("movieTrimStart")?.value || 0));
      const trimEnd = Math.max(0, Number(document.getElementById("movieTrimEnd")?.value || 0));
      const speed = Number(document.getElementById("movieSpeed")?.value || 1) || 1;
      const filter = document.getElementById("movieFilter")?.value || "none";
      const adultFlag = !!(adultCheck && adultCheck.checked) || !!(document.getElementById("movieAdult")?.checked);
      // Menores no pueden subir 18+
      if (adultFlag && typeof window.orbyeIsAdult === "function" && !window.orbyeIsAdult()) {
        if (msg) msg.textContent = "Necesitas ser mayor de 18 para marcar contenido adulto.";
        showToast("Solo adultos pueden subir 18+", "error");
        return;
      }
      const item = {
        id,
        title: t,
        desc: d,
        fileName: f.name,
        cover: coverUrl,
        uploader: user,
        ts: Date.now(),
        adult: adultFlag,
        hasBgm: !!bgmFile,
        visibility: vis,
        category: cat,
        tags,
        hashtags,
        caption,
        captionX,
        captionY,
        captionColor,
        captionRot,
        isClip,
        isPhoto: isPhoto || isPhotoForce,
        captionOpac: Number(document.getElementById("movieCaptionOpac")?.value || 100),
        trimStart,
        trimEnd,
        speed,
        filter,
        aiMade: !!(document.getElementById("movieAiMade")?.checked),
        contentType: document.getElementById("movieContentType")?.value || "video"
      };
      videoMeta.unshift(item);
      saveMeta(videoMeta);

      const all = loadStats();
      all[id] = { views: 0, likes: 0, watchTicks: 0, uniqueLikers: [] };
      saveStats(all);

      if (msg) msg.textContent = "✓ Video publicado en OrbyTube.";
      if (title) title.value = "";
      if (descEl) descEl.value = "";
      if (file) file.value = "";
      if (cover) cover.value = "";
      if (adultCheck) adultCheck.checked = false;
      if (bgmInput) bgmInput.value = "";
      croppedCoverDataUrl = null;
      showStudioPreview(null);
      thumbImg = null;
      if (thumbCropBox) thumbCropBox.hidden = true;
      if (thumbPreview) { thumbPreview.hidden = true; thumbPreview.src = ""; }
      showOtHome();
      renderList();
      await selectVideo(id);
      showToast("Video publicado", "ok");
    } catch (err) {
      console.error(err);
      if (msg) msg.textContent = "Error al subir: " + (err && err.message ? err.message : "intenta de nuevo");
      showToast("Error al subir. ¿IndexedDB bloqueado? Prueba otro navegador.", "error");
    } finally {
      if (save) save.disabled = false;
    }
  });

  grid?.addEventListener("click", e => {
    const btn = e.target.closest("[data-id]");
    if (btn) selectVideo(btn.dataset.id);
  });

  otStart?.addEventListener("click", () => {
    const el = document.getElementById("otVideoEl");
    const photoEl = document.getElementById("otPhotoEl");
    // photo mode toggle if metadata says photo
    try {
      const metaV = videoMeta.find(x => x.id === currentId || x.id === id);
      if (metaV && metaV.isPhoto && photoEl) {
        if (el) el.hidden = true;
        photoEl.hidden = false;
      } else if (photoEl) {
        photoEl.hidden = true;
        if (el) el.hidden = false;
      }
    } catch(_){}
    if (el) {
      el.play().catch(() => {});
      if (currentId) startViewTracking(currentId);
    } else showToast("Elige un video primero", "warn");
  });

  document.getElementById("otShareLink")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentId) {
      showToast("Elige un video primero", "warn");
      return;
    }
    const link = location.origin + location.pathname.replace(/\/index\.html$/i, "/") + "#orbytube?v=" + encodeURIComponent(currentId);
    const clean = location.origin + "/#orbytube?v=" + encodeURIComponent(currentId);
    const finalLink = (location.pathname && location.pathname !== "/") ? link : clean;
    navigator.clipboard.writeText(finalLink).then(() => {
      showToast("Link copiado", "ok");
    }).catch(() => {
      prompt("Copia el link:", finalLink);
    });
  });

  otLike?.addEventListener("click", () => {
    if (!currentId) return;
    const user = getUser();
    if (!user) {
      requireLogin();
      return;
    }
    const all = loadStats();
    if (!all[currentId]) all[currentId] = { views: 0, likes: 0, watchTicks: 0, uniqueLikers: [] };
    const st = all[currentId];
    let likers = Array.isArray(st.uniqueLikers) ? st.uniqueLikers : [];
    // Toggle: like / quitar like
    if (likers.includes(user)) {
      likers = likers.filter(u => u !== user);
      st.likes = Math.max(0, (st.likes || 1) - 1);
      st.uniqueLikers = likers;
      saveStats(all);
      updateStatsUI(currentId);
      renderList();
      if (otLike) {
        otLike.classList.remove("liked");
        const ico = otLike.querySelector(".heart-ico");
        if (ico) ico.textContent = "♡";
      }
      showToast("Like quitado", "info");
      return;
    }
    st.likes = (st.likes || 0) + 1;
    likers.push(user);
    st.uniqueLikers = likers;
    saveStats(all);
    updateStatsUI(currentId);
    renderList();
    if (otLike) {
      otLike.classList.add("liked");
      const ico = otLike.querySelector(".heart-ico");
      if (ico) ico.textContent = "♥";
    }
    showToast("Like enviado", "ok");
    const vid = videoMeta.find(x => x.id === currentId);
    if (vid && typeof window.orbyeNotify === "function") {
      window.orbyeNotify(vid.uploader, user + " dio like a tu video", "like", "#orbytube");
    }
  });

  otDelete?.addEventListener("click", async () => {
    if (!currentId) return;
    const v = videoMeta.find(x => x.id === currentId);
    if (!v) return;
    if (!(isModerator() || (getUser() && v.uploader === getUser()))) {
      showToast("Solo el autor o moderador puede eliminar", "error");
      return;
    }
    try { await idbDelete(currentId); } catch {}
    if (objectUrls[currentId]) {
      URL.revokeObjectURL(objectUrls[currentId]);
      delete objectUrls[currentId];
    }
    videoMeta = videoMeta.filter(x => x.id !== currentId);
    saveMeta(videoMeta);
    const all = loadStats();
    delete all[currentId];
    saveStats(all);
    stopViewTracking();
    stopBgm();
    currentId = null;
    if (player) {
      player.classList.add("empty");
      player.innerHTML = `<div class="ot-placeholder"><span>▶</span><p>Elige un video o sube el primero</p></div>`;
    }
    if (meta) meta.hidden = true;
    renderList();
    showToast("Video eliminado", "info");
  });

  adultFilterToggle?.addEventListener("change", () => {
    if (adultFilterToggle.checked && !canViewAdult()) {
      adultFilterToggle.checked = false;
      showToast("Primero marca en tu perfil que eres mayor de edad.", "warn");
      document.getElementById("profileButton")?.click();
      return;
    }
    renderList();
  });

  document.getElementById("otBackToGrid")?.addEventListener("click", () => {
    stopBgm();
    stopViewTracking();
    currentId = null;
    window.__otCurrentId = null;
    if (playerBlock) {
      playerBlock.hidden = true;
      playerBlock.style.display = "none";
    }
    if (videoGrid) {
      videoGrid.hidden = false;
      videoGrid.style.display = "";
    }
    const side = document.getElementById("otSideList");
    if (side) side.hidden = false;
    const player = document.getElementById("orbytubePlayer");
    if (player) {
      player.classList.add("empty");
      player.innerHTML = "";
    }
    if (meta) meta.hidden = true;
    if (typeof window.orbyeRenderComments === "function") window.orbyeRenderComments(null);
    renderList();
    videoGrid?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // click on youtube grid cards
  videoGrid?.addEventListener("click", e => {
    const btn = e.target.closest("[data-id]");
    if (btn) selectVideo(btn.dataset.id);
  });

  document.getElementById("movieFile2Pick")?.addEventListener("click", () => document.getElementById("movieFile2")?.click());
  document.getElementById("movieFile2")?.addEventListener("change", () => {
    const f = document.getElementById("movieFile2")?.files?.[0];
    const el = document.getElementById("movieFile2Name");
    if (el) el.textContent = f ? (f.name + " (se publicará el clip principal; unión completa requiere backend)") : "Unir después del primero";
    if (f) showToast("Clip 2 anotado. Unión avanzada en próxima versión de servidor.", "info");
  });

  window.orbyeSelectVideo = (id) => selectVideo(id);

  // Open profile from video author name
  document.getElementById("orbytubeMeta")?.addEventListener("click", e => {
    const hit = e.target.closest("[data-user]");
    if (hit && hit.dataset.user && typeof window.orbyeOpenProfile === "function") {
      window.orbyeOpenProfile(hit.dataset.user);
    }
  });
  document.getElementById("otVideoGrid")?.addEventListener("click", e => {
    const hit = e.target.closest(".user-hit[data-user]");
    if (hit && hit.dataset.user) {
      e.stopPropagation();
      if (typeof window.orbyeOpenProfile === "function") window.orbyeOpenProfile(hit.dataset.user);
    }
  });


  document.getElementById("otHomeNav")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-ot-tab]");
    if (!btn) return;
    otTab = btn.dataset.otTab || "home";
    document.querySelectorAll(".ot-nav-btn").forEach(b => b.classList.toggle("active", b === btn));
    renderList();
  });

  // init
  videoMeta = loadMeta();
  // Abrir video por link #orbytube?v=id
  try {
    const h = location.hash || "";
    const m = h.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (m) {
      setTimeout(() => { if (window.orbyeOpenVideo) window.orbyeOpenVideo(m[1]); }, 300);
    }
  } catch {}

  renderList();
})();


// OrbyTube comments — ONE thread per video id
(() => {
  const CKEY = "orbye_orbytube_comments_v2";
  const listEl = document.getElementById("otComments");
  const textEl = document.getElementById("otCommentText");
  const sendBtn = document.getElementById("otCommentSend");
  const emojiBtn = document.getElementById("otCommentEmoji");
  const photoBtn = document.getElementById("otCommentPhoto");
  const imgInput = document.getElementById("otCommentImage");
  const preview = document.getElementById("otCommentPreview");
  const picker = document.getElementById("otCommentEmojiPicker");
  const statsEl = document.getElementById("otCommentStats");
  let pendingImg = null;
  window.orbyeSetCommentGif = function(url) {
    pendingImg = url;
    if (preview) {
      preview.hidden = false;
      preview.innerHTML = `<img src="${url}" alt="gif">`;
    }
  };
  const emojis = ["😀","😂","🔥","❤️","👍","🐉","✨","👏","😮","💯","🚀","😎"];

  function getUser() { return localStorage.getItem("orbye_demo_user"); }

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(CKEY) || "{}"); } catch { return {}; }
  }
  function saveAll(o) { localStorage.setItem(CKEY, JSON.stringify(o)); }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function avatarHtml(username) {
    if (typeof window.orbyeAvatarHtml === "function") {
      return window.orbyeAvatarHtml(username, "sm");
    }
    try {
      const profiles = JSON.parse(localStorage.getItem("orbye_user_profiles_v1") || "{}");
      const p = profiles[username] || {};
      if (p.photo) return `<img class="ot-c-av" src="${p.photo}" alt="">`;
    } catch {}
    const letter = (username || "?")[0].toUpperCase();
    return `<span class="ot-c-av ot-c-av-letter">${esc(letter)}</span>`;
  }

  function videoId() {
    const panel = document.getElementById("otCommentsPanel");
    const fromPanel = panel && panel.dataset.videoId;
    const id = fromPanel || window.__otCurrentId || null;
    return id || null;
  }

  function videoStats(id) {
    try {
      const stAll = JSON.parse(localStorage.getItem("orbye_orbytube_stats_v3") || "{}");
      const st = stAll[id] || {};
      return { likes: st.likes || 0, views: st.views || 0 };
    } catch {
      return { likes: 0, views: 0 };
    }
  }

  function renderComments(id) {
    if (!listEl) return;
    const panel = document.getElementById("otCommentsPanel");
    if (panel) {
      if (id) panel.dataset.videoId = id;
      else delete panel.dataset.videoId;
    }
    if (!id) {
      listEl.innerHTML = '<p class="muted">Elige un video para ver sus comentarios.</p>';
      if (statsEl) statsEl.textContent = "—";
      return;
    }
    const all = loadAll();
    // ONLY this video's array — never mix
    const list = Array.isArray(all[id]) ? all[id].filter(c => !c.videoId || c.videoId === id) : [];
    const st = videoStats(id);
    if (statsEl) {
      statsEl.textContent = list.length + " comentarios · " + st.likes + " likes · " + (st.views || 0) + " vistas (únicas)";
    }
    if (!list.length) {
      listEl.innerHTML = '<p class="muted">Sé el primero en comentar este video.</p>';
      return;
    }
    const me = getUser();
    const meIsMod = !!(me && (me === "DavidAvila" || (typeof window.orbyeIsGlobalMod === "function" && window.orbyeIsGlobalMod()) || (typeof window.isOrbyeModUser === "function" && window.isOrbyeModUser(me))));
    listEl.innerHTML = list.map(c => {
      const canDel = me && (c.user === me || meIsMod);
      return `<div class="ot-comment" data-cid="${esc(c.id || "")}">
        <button type="button" class="ot-c-user user-hit" data-user="${esc(c.user)}">
          ${avatarHtml(c.user)}
          <span class="ot-c-name">${esc(c.user)}</span>${(typeof window.orbyeModBadgeHtml==="function"?window.orbyeModBadgeHtml(c.user):"")}
        </button>
        <div class="ot-c-body">
          <p>${esc(c.text)}</p>
          ${c.image ? `<img src="${c.image}" alt="" class="ot-comment-img">` : ""}
          <div class="ot-c-foot">
            <small>${new Date(c.ts).toLocaleString("es-ES")}</small>
            ${canDel ? `<button type="button" class="ot-c-del" data-del-comment="${esc(c.id || "")}" data-vid="${esc(id)}">Eliminar</button>` : ""}
          </div>
        </div>
      </div>`;
    }).join("");
  }

  window.orbyeRenderComments = renderComments;

  // When main player selects a video
  const prevSelect = window.orbyeSelectVideo;
  window.orbyeSelectVideo = async function (id) {
    window.__otCurrentId = id;
    if (typeof prevSelect === "function") await prevSelect(id);
    renderComments(id);
  };

  // Hook native select via Mutation / periodic - also listen clicks
  document.getElementById("otVideoGrid")?.addEventListener("click", e => {
    const id = e.target.closest("[data-id]")?.dataset?.id;
    if (id) {
      window.__otCurrentId = id;
      setTimeout(() => renderComments(id), 50);
    }
  });
  document.getElementById("movieGrid")?.addEventListener("click", e => {
    const id = e.target.closest("[data-id]")?.dataset?.id;
    if (id) {
      window.__otCurrentId = id;
      setTimeout(() => renderComments(id), 50);
    }
  });

  // Profile + delete own comment
  listEl?.addEventListener("click", e => {
    const del = e.target.closest("[data-del-comment]");
    if (del) {
      const cid = del.dataset.delComment;
      const vid = del.dataset.vid || videoId();
      const me = getUser();
      if (!me || !vid || !cid) return;
      const all = loadAll();
      if (!Array.isArray(all[vid])) return;
      all[vid] = all[vid].filter(c => !(c.id === cid && c.user === me));
      saveAll(all);
      renderComments(vid);
      return;
    }
    const hit = e.target.closest(".user-hit");
    if (!hit) return;
    const u = hit.dataset.user;
    if (u && typeof window.orbyeOpenProfile === "function") {
      window.orbyeOpenProfile(u);
    } else if (u) {
      document.getElementById("profileButton")?.click();
    }
  });

  photoBtn?.addEventListener("click", () => imgInput?.click());
  imgInput?.addEventListener("change", () => {
    const f = imgInput.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    if (f.size > 1.5 * 1024 * 1024) return;
    const r = new FileReader();
    r.onload = () => {
      pendingImg = r.result;
      if (preview) {
        preview.hidden = false;
        preview.innerHTML = `<img src="${pendingImg}" alt="">`;
      }
    };
    r.readAsDataURL(f);
  });

  emojiBtn?.addEventListener("click", () => {
    if (!picker) return;
    picker.hidden = !picker.hidden;
    if (!picker.hidden) {
      picker.innerHTML = emojis.map(e => `<button type="button" data-em="${e}">${e}</button>`).join("");
    }
  });
  picker?.addEventListener("click", e => {
    const em = e.target.dataset?.em;
    if (!em || !textEl) return;
    textEl.value += em;
    picker.hidden = true;
  });

  sendBtn?.addEventListener("click", () => {
    const user = getUser();
    if (!user) {
      document.getElementById("accountPanel").hidden = false;
      return;
    }
    const id = videoId();
    if (!id) {
      alert("Elige un video primero");
      return;
    }
    const text = (textEl?.value || "").trim();
    if (!text && !pendingImg) return;

    const all = loadAll();
    // Wipe any accidental non-array
    if (!Array.isArray(all[id])) all[id] = [];
    all[id].push({
      id: crypto.randomUUID(),
      user,
      text,
      image: pendingImg,
      ts: Date.now(),
      videoId: id
    });
    // Never write to other keys
    saveAll(all);
    console.log("[OrbyTube] comentario en video", id, "total", all[id].length);

    try {
      const vids = JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || "[]");
      const v = vids.find(x => x.id === id);
      if (v && typeof window.orbyeNotify === "function") {
        window.orbyeNotify(v.uploader, user + " comentó tu video", "comment", "#orbytube");
      }
    } catch {}

    if (textEl) textEl.value = "";
    pendingImg = null;
    if (preview) { preview.hidden = true; preview.innerHTML = ""; }
    if (imgInput) imgInput.value = "";
    renderComments(id);
  });

  // initial empty
  renderComments(null);
})();


// Veltx Music, Playlists & Downloads
(() => {
  const PL_KEY = "orbye_veltx_playlists_v1";
  const listEl = document.getElementById("veltxPlaylistList");
  const sel = document.getElementById("veltxTrackPlaylist");
  const audio = document.getElementById("veltxAudioPlayer");
  const now = document.getElementById("veltxNowPlaying");
  let pendingAudio = null;

  function getUser() { return localStorage.getItem("orbye_demo_user"); }
  function loadPL() {
    try { return JSON.parse(localStorage.getItem(PL_KEY) || "{}"); } catch { return {}; }
  }
  function savePL(o) { localStorage.setItem(PL_KEY, JSON.stringify(o)); }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function renderPlaylists() {
    const all = loadPL();
    const ids = Object.keys(all);
    if (sel) {
      sel.innerHTML = ids.length
        ? ids.map(id => `<option value="${esc(id)}">${esc(all[id].name)}</option>`).join("")
        : '<option value="">Crea una playlist primero</option>';
    }
    if (!listEl) return;
    if (!ids.length) {
      listEl.innerHTML = '<p class="muted">No hay playlists. Crea la primera.</p>';
      return;
    }
    listEl.innerHTML = ids.map(id => {
      const pl = all[id];
      const tracks = (pl.tracks || []).map((t, i) =>
        `<button type="button" class="veltx-track-btn" data-pl="${esc(id)}" data-i="${i}">▶ ${esc(t.title)}</button>`
      ).join("") || '<span class="muted">Sin tracks</span>';
      return `<div class="veltx-pl-item"><b>${esc(pl.name)}</b><small>por ${esc(pl.owner)}</small><div class="veltx-tracks">${tracks}</div></div>`;
    }).join("");
  }

  document.getElementById("veltxPlaylistCreate")?.addEventListener("click", () => {
    const user = getUser();
    if (!user) { document.getElementById("accountPanel").hidden = false; return; }
    const name = (document.getElementById("veltxPlaylistName")?.value || "").trim();
    if (!name) return;
    const all = loadPL();
    const id = crypto.randomUUID();
    all[id] = { id, name, owner: user, tracks: [], ts: Date.now() };
    savePL(all);
    const inp = document.getElementById("veltxPlaylistName");
    if (inp) inp.value = "";
    renderPlaylists();
    showToast("Playlist creada", "ok");
  });

  document.getElementById("veltxTrackPick")?.addEventListener("click", () => document.getElementById("veltxTrackFile")?.click());
  document.getElementById("veltxTrackFile")?.addEventListener("change", () => {
    const f = document.getElementById("veltxTrackFile")?.files?.[0];
    const el = document.getElementById("veltxTrackName");
    if (!f) return;
    if (!f.type.startsWith("audio/")) { showToast("Solo audio", "error"); return; }
    if (f.size > 12 * 1024 * 1024) { showToast("Audio máx 12MB", "error"); return; }
    const r = new FileReader();
    r.onload = () => {
      pendingAudio = { name: f.name, dataUrl: r.result };
      if (el) el.textContent = f.name;
    };
    r.readAsDataURL(f);
  });

  document.getElementById("veltxTrackAdd")?.addEventListener("click", () => {
    const user = getUser();
    if (!user) { document.getElementById("accountPanel").hidden = false; return; }
    const plId = sel?.value;
    if (!plId) { showToast("Crea una playlist primero", "warn"); return; }
    const title = (document.getElementById("veltxTrackTitle")?.value || "").trim() || (pendingAudio?.name || "Track");
    const url = (document.getElementById("veltxTrackUrl")?.value || "").trim();
    if (!url && !pendingAudio) { showToast("URL o archivo de audio requerido", "warn"); return; }
    const all = loadPL();
    if (!all[plId]) return;
    all[plId].tracks.push({
      title,
      url: url || null,
      dataUrl: pendingAudio?.dataUrl || null,
      by: user,
      ts: Date.now()
    });
    savePL(all);
    pendingAudio = null;
    const tn = document.getElementById("veltxTrackName");
    if (tn) tn.textContent = "Sube un audio";
    const ti = document.getElementById("veltxTrackTitle");
    const tu = document.getElementById("veltxTrackUrl");
    if (ti) ti.value = "";
    if (tu) tu.value = "";
    renderPlaylists();
    showToast("Track añadido", "ok");
  });

  listEl?.addEventListener("click", e => {
    const btn = e.target.closest("[data-pl]");
    if (!btn) return;
    const all = loadPL();
    const pl = all[btn.dataset.pl];
    const t = pl?.tracks?.[Number(btn.dataset.i)];
    if (!t || !audio) return;
    const src = t.dataUrl || t.url;
    if (!src) return;
    audio.src = src;
    audio.play().catch(() => {});
    if (now) now.textContent = "♪ " + t.title + " — " + (t.by || "");
  });

  // Downloads helper — only direct media URLs
  document.getElementById("veltxDlBtn")?.addEventListener("click", () => {
    const url = (document.getElementById("veltxDlUrl")?.value || "").trim();
    const msg = document.getElementById("veltxDlMsg");
    const box = document.getElementById("veltxDlResult");
    if (!url) {
      if (msg) msg.textContent = "Pega un enlace.";
      return;
    }
    // Only allow obvious direct media or same-origin; cannot legally scrape TikTok/Pinterest
    const isDirect = /\.(mp4|webm|mov|mkv|mp3|ogg|wav)(\?|$)/i.test(url) || url.startsWith("blob:");
    if (!isDirect) {
      if (msg) {
        msg.textContent = "Solo enlaces directos a archivos de video/audio (ej. .mp4). No se pueden saltar protecciones de TikTok/Pinterest.";
        msg.style.color = "#f88";
      }
      if (box) box.hidden = true;
      return;
    }
    if (msg) {
      msg.textContent = "Enlace directo detectado. Puedes descargar.";
      msg.style.color = "#6dce8a";
    }
    if (box) {
      box.hidden = false;
      box.innerHTML = `<a class="button white" href="${url.replace(/"/g, "")}" download target="_blank" rel="noopener">Descargar archivo</a>`;
    }
  });

  renderPlaylists();

  document.addEventListener("click", e => {
    const b = e.target.closest("#otShareLink, [data-copy-video-link]");
    if (!b) return;
    const id = b.dataset.videoId || currentId;
    if (!id) return;
    const link = location.origin + location.pathname + "#orbytube?v=" + encodeURIComponent(id);
    navigator.clipboard.writeText(link).then(() => {
      if (typeof showToast === "function") showToast("Link del video copiado", "ok");
    }).catch(() => {
      prompt("Copia el link del video:", link);
    });
  });

  window.orbyeOpenVideo = function(id) {
    if (!id) return;
    currentId = id;
    location.hash = "#orbytube";
    const home = document.getElementById("otViewHome");
    const create = document.getElementById("otViewCreate");
    if (create) create.hidden = true;
    if (home) home.hidden = false;
    if (typeof openPlayer === "function") openPlayer(id);
    else if (typeof playVideo === "function") playVideo(id);
    else {
      const v = videoMeta.find(x => x.id === id);
      if (v && typeof selectVideo === "function") selectVideo(v);
    }
  };

  window.orbyeVideoLink = function(id) {
    return location.origin + location.pathname + "#orbytube?v=" + encodeURIComponent(id);
  };
})();

// Veltx Clips nav
document.getElementById("veltxClipsNav")?.addEventListener("click", e => {
  e.preventDefault();
  location.hash = "#orbytube";
  window.__veltxClipsOnly = true;
  if (typeof window.orbyeRenderVeltxList === "function") window.orbyeRenderVeltxList();
  else {
    document.querySelectorAll(".ot-item, [data-id]").forEach(el => {
      /* soft filter after render */
    });
  }
  setTimeout(() => {
    try {
      const meta = JSON.parse(localStorage.getItem("orbye_orbytube_meta_v3") || localStorage.getItem("orbye_orbytube_meta_v2") || "[]");
      const clips = new Set(meta.filter(v => v.isClip).map(v => v.id));
      document.querySelectorAll("#otVideoGrid [data-id], #movieGrid [data-id]").forEach(el => {
        const id = el.getAttribute("data-id");
        el.style.display = clips.has(id) ? "" : "none";
      });
    } catch (_) {}
  }, 200);
});

// HASH_VIDEO_BOOT — open shared Veltx links on any device (metadata must exist locally or cloud)
(function bootVideoHash() {
  function tryOpen() {
    const h = location.hash || "";
    const m = h.match(/orbytube\?v=([^&]+)/) || h.match(/[?&]v=([^&]+)/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    if (typeof window.orbyeOpenVideo === "function") {
      setTimeout(() => window.orbyeOpenVideo(id), 400);
    }
  }
  window.addEventListener("hashchange", tryOpen);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryOpen);
  else tryOpen();
  setTimeout(tryOpen, 1000);
})();

// REPAIR_VIEW_COUNTS — arregla estadísticas infladas de versiones viejas
(function repairViews() {
  try {
    const KEY = "orbye_veltx_stats_v1";
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    let changed = false;
    Object.keys(all).forEach(id => {
      const st = all[id];
      if (!st) return;
      if (!Array.isArray(st.viewers)) st.viewers = [];
      // Si hay más views que viewers, corregir
      if ((st.views || 0) > st.viewers.length) {
        st.views = st.viewers.length;
        changed = true;
      }
      // Si views > 5 y solo 0-1 viewers, reset a viewers length
      if ((st.views || 0) > 5 && st.viewers.length <= 1) {
        st.views = st.viewers.length;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(KEY, JSON.stringify(all));
  } catch (_) {}
})();
