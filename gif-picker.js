(() => {
  const GIPHY_KEY = "pFFKfTN75juDqBrmKOgTQa82jHUwClEO";
  let pop = null;
  let deliverTarget = "post";
  let drag = null;

  function setMsg(t) {
    const el = document.getElementById("gifMiniMsg");
    if (el) el.textContent = t || "";
  }

  async function fetchGiphy(pathAndQuery) {
    const direct = "https://api.giphy.com" + pathAndQuery;
    // 1) Direct
    try {
      const res = await fetch(direct, { method: "GET", mode: "cors" });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("giphy direct", e);
    }
    // 2) Proxies (si el navegador bloquea)
    const proxies = [
      "https://corsproxy.io/?" + encodeURIComponent(direct),
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(direct)
    ];
    for (const p of proxies) {
      try {
        const res = await fetch(p);
        if (!res.ok) continue;
        const text = await res.text();
        return JSON.parse(text);
      } catch (e) {
        console.warn("giphy proxy", e);
      }
    }
    throw new Error("giphy unreachable");
  }

  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.id = "gifMiniMenu";
    pop.className = "gif-mini-menu";
    pop.hidden = true;
    pop.innerHTML = `
      <div class="gif-mini-head" id="gifDragHandle">
        <strong>⋮⋮ Giphy · GIFs</strong>
        <button type="button" class="gif-mini-x" id="gifMiniClose">×</button>
      </div>
      <div class="gif-mini-search">
        <input id="gifMiniInput" type="search" placeholder="Buscar en Giphy..." maxlength="80" autocomplete="off">
        <button type="button" class="gif-mini-btn" id="gifMiniSearchBtn">Buscar</button>
      </div>
      <div class="gif-mini-tabs">
        <button type="button" class="gif-tab active" data-tab="trending">Populares</button>
        <button type="button" class="gif-tab" data-tab="upload">Subir</button>
      </div>
      <div class="gif-mini-actions" id="gifMiniUploadRow" hidden>
        <button type="button" class="gif-mini-btn ghost" id="gifMiniUpload">Subir GIF</button>
        <input type="file" id="gifMiniFile" accept="image/gif,image/webp,image/*,.gif" hidden>
      </div>
      <p id="gifMiniMsg" class="gif-mini-msg">Cargando Giphy…</p>
      <div id="gifMiniResults" class="gif-mini-results"></div>
    `;
    document.body.appendChild(pop);

    document.getElementById("gifMiniClose").onclick = e => { e.stopPropagation(); closeMenu(); };
    document.getElementById("gifMiniSearchBtn").onclick = () => {
      const q = (document.getElementById("gifMiniInput").value || "").trim();
      q ? search(q) : loadTrending();
    };
    document.getElementById("gifMiniInput").onkeydown = e => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = (document.getElementById("gifMiniInput").value || "").trim();
        q ? search(q) : loadTrending();
      }
    };
    pop.querySelectorAll(".gif-tab").forEach(tab => {
      tab.onclick = () => {
        pop.querySelectorAll(".gif-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const row = document.getElementById("gifMiniUploadRow");
        if (tab.dataset.tab === "upload") {
          row.hidden = false;
          setMsg("Sube un GIF de tu PC");
        } else {
          row.hidden = true;
          loadTrending();
        }
      };
    });
    document.getElementById("gifMiniUpload").onclick = () => document.getElementById("gifMiniFile").click();
    document.getElementById("gifMiniFile").onchange = () => {
      const f = document.getElementById("gifMiniFile").files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => deliver(r.result, f.name);
      r.readAsDataURL(f);
    };
    document.getElementById("gifMiniResults").onclick = e => {
      const btn = e.target.closest(".gif-mini-item");
      if (!btn) return;
      const list = document.getElementById("gifMiniResults")._list || [];
      const g = list[Number(btn.dataset.i)];
      if (g?.url) deliver(g.url, "giphy.gif");
    };

    const handle = document.getElementById("gifDragHandle");
    handle.style.cursor = "move";
    handle.onpointerdown = e => {
      if (e.target.closest("button")) return;
      const r = pop.getBoundingClientRect();
      drag = { ox: e.clientX - r.left, oy: e.clientY - r.top };
      pop.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    handle.onpointermove = e => {
      if (!drag) return;
      pop.style.left = Math.max(0, Math.min(window.innerWidth - pop.offsetWidth, e.clientX - drag.ox)) + "px";
      pop.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.oy)) + "px";
      pop.style.bottom = "auto";
      pop.style.transform = "none";
    };
    handle.onpointerup = () => { drag = null; };

    return pop;
  }

  function openMenu(btn, target) {
    deliverTarget = target || "post";
    const p = ensurePop();
    p.hidden = false;
    if (!p.dataset.placed) {
      const w = Math.min(360, window.innerWidth - 16);
      p.style.width = w + "px";
      p.style.left = Math.max(8, (window.innerWidth - w) / 2) + "px";
      p.style.top = "80px";
      p.style.transform = "none";
      p.dataset.placed = "1";
    }
    document.getElementById("gifMiniInput").value = "";
    document.getElementById("gifMiniUploadRow").hidden = true;
    loadTrending();
  }

  function closeMenu() {
    if (pop) pop.hidden = true;
  }

  function deliver(url, name) {
    const t = deliverTarget || "post";
    if (t === "post" && window.orbyeSetPostGif) window.orbyeSetPostGif(url, name || "gif.gif");
    else if (t === "comment" && window.orbyeSetCommentGif) window.orbyeSetCommentGif(url);
    else if (t === "chat" && window.orbyeSetChatGif) window.orbyeSetChatGif(url, name || "gif.gif");
    else if (t === "staff" && window.orbyeSetStaffGif) window.orbyeSetStaffGif(url, name || "gif.gif");
    closeMenu();
  }

  function renderList(list, label) {
    const box = document.getElementById("gifMiniResults");
    if (!list.length) {
      setMsg("Sin resultados.");
      box.innerHTML = "";
      return;
    }
    setMsg(label);
    box.innerHTML = list.map((g, i) =>
      `<button type="button" class="gif-mini-item" data-i="${i}">
        <img src="${g.preview}" alt="" loading="lazy" referrerpolicy="no-referrer">
      </button>`
    ).join("");
    box._list = list;
  }

  function mapGiphy(json) {
    const list = [];
    (json.data || []).forEach(g => {
      const imgs = g.images || {};
      const url = imgs.fixed_height?.url || imgs.downsized?.url || imgs.original?.url;
      const preview = imgs.fixed_height_small?.url || imgs.fixed_height?.url || url;
      if (url) list.push({ url, preview, title: g.title || "GIF" });
    });
    return list;
  }

  async function loadTrending() {
    setMsg("Cargando Giphy…");
    try {
      const json = await fetchGiphy(
        "/v1/gifs/trending?api_key=" + encodeURIComponent(GIPHY_KEY) + "&limit=36&rating=pg-13"
      );
      const list = mapGiphy(json);
      if (list.length) {
        renderList(list, "Populares Giphy — toca uno");
        return;
      }
      setMsg("Giphy vacío. Escribe una búsqueda.");
    } catch (e) {
      console.warn(e);
      setMsg("No conecta con Giphy. Prueba Subir GIF o desactiva bloqueadores.");
    }
  }

  async function search(q) {
    setMsg('Buscando "' + q + '"…');
    try {
      const json = await fetchGiphy(
        "/v1/gifs/search?api_key=" + encodeURIComponent(GIPHY_KEY) +
        "&q=" + encodeURIComponent(q) + "&limit=36&rating=pg-13&lang=es"
      );
      const list = mapGiphy(json);
      if (list.length) {
        renderList(list, '"' + q + '" — ' + list.length + " GIFs");
        return;
      }
      setMsg("Sin resultados para \"" + q + "\"");
    } catch (e) {
      console.warn(e);
      setMsg("No conecta con Giphy. Usa Subir GIF.");
    }
  }

  function init() {
    document.addEventListener("click", e => {
      const btn = e.target.closest("#postGifBtn, #gifBtn, #otCommentGifBtn, #chatGifBtn, #staffGifBtn, [data-gif-open]");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        let target = btn.dataset.gifTarget || "post";
        if (btn.id === "otCommentGifBtn") target = "comment";
        else if (btn.id === "gifBtn" || btn.id === "chatGifBtn") target = "chat";
        else if (btn.id === "staffGifBtn") target = "staff";
        else if (btn.id === "postGifBtn") target = "post";
        openMenu(btn, target);
      }
    }, true);

    const fab = document.getElementById("openMovieUpload");
    if (fab) {
      let d = null, moved = false;
      fab.style.touchAction = "none";
      fab.addEventListener("pointerdown", e => {
        if (e.button !== 0) return;
        const r = fab.getBoundingClientRect();
        d = { ox: e.clientX - r.left, oy: e.clientY - r.top };
        moved = false;
        fab.setPointerCapture(e.pointerId);
      });
      fab.addEventListener("pointermove", e => {
        if (!d) return;
        if (Math.abs(e.movementX) + Math.abs(e.movementY) > 3) moved = true;
        fab.style.position = "fixed";
        fab.style.left = Math.max(4, Math.min(window.innerWidth - fab.offsetWidth - 4, e.clientX - d.ox)) + "px";
        fab.style.top = Math.max(4, Math.min(window.innerHeight - fab.offsetHeight - 4, e.clientY - d.oy)) + "px";
        fab.style.right = "auto";
        fab.style.bottom = "auto";
      });
      fab.addEventListener("pointerup", e => {
        if (d && moved) { e.preventDefault(); e.stopPropagation(); }
        d = null;
      });
    }

    window.orbyeOpenGifPicker = (target, btn) => openMenu(btn, target || "post");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
