(() => {
  let callWin = null;
  function status(t) {
    const el = document.getElementById("callStatus");
    if (el) el.textContent = t;
  }
  function genCode() {
    const c = "orbye-" + Math.random().toString(36).slice(2, 8);
    const input = document.getElementById("callRoomCode");
    if (input) {
      input.value = c;
      input.removeAttribute("readonly");
    }
    // each click = new unique room
    status("Nuevo código de tu sala: " + c + " · Compártelo con quien quieras.");
    return c;
  }
  function isCreator() {
    const u = (localStorage.getItem("orbye_demo_user") || "").toLowerCase();
    return u === "davidavila" || localStorage.getItem("orbye_demo_email") === "avilarodriguezdavid13@gmail.com";
  }
  let _pendingCall = null;
  function showCallSafety(thenFn) {
    _pendingCall = thenFn;
    const p = document.getElementById("callSafetyPanel");
    if (p) { p.hidden = false; p.style.display = "flex"; }
    else if (typeof thenFn === "function") thenFn();
  }
  document.getElementById("callSafetyContinue")?.addEventListener("click", () => {
    const p = document.getElementById("callSafetyPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
    if (typeof _pendingCall === "function") { const f = _pendingCall; _pendingCall = null; f(); }
  });
  document.getElementById("callSafetyCancel")?.addEventListener("click", () => {
    const p = document.getElementById("callSafetyPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
    _pendingCall = null;
    status("Cancelado");
  });
  document.getElementById("closeCallSafety")?.addEventListener("click", () => {
    document.getElementById("callSafetyCancel")?.click();
  });

  function peerAvatar() {
    // AVATAR_JITSI
    try {
      const u = localStorage.getItem("orbye_demo_user");
      const all = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
      const p = all[u];
      if (p && p.photo && String(p.photo).indexOf("data:") === 0) return p.photo;
    } catch (_) {}
    try {
      return location.origin + "/assets/orbye-logo.png";
    } catch (_) { return ""; }
  }
  function peerName() {
    const base = localStorage.getItem("orbye_demo_user") || "Usuario";
    let sid = sessionStorage.getItem("orbye_call_tab_id");
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 7);
      sessionStorage.setItem("orbye_call_tab_id", sid);
    }
    // Cada pestaña = identidad distinta en Jitsi
    return base + "-" + sid;
  }
  function openRoom(code, audioOnly, silent) {
    code = (code || "").trim();
    if (!code) {
      status("Escribe o genera un código");
      return;
    }
    const room = "OrbyE" + code.replace(/[^a-zA-Z0-9]/g, "");
    const dn = encodeURIComponent(peerName());
    const av = encodeURIComponent(peerAvatar() || "");
    let url = "https://meet.jit.si/" + encodeURIComponent(room);
    url += "#userInfo.displayName=%22" + dn + "%22";
    if (av) url += "&userInfo.avatarURL=%22" + av + "%22";
    url += "&config.prejoinPageEnabled=false&config.disableDeepLinking=true";
    if (audioOnly) url += "#config.startWithVideoMuted=true";
    if (callWin && !callWin.closed) {
      callWin.location.href = url;
      callWin.focus();
    } else {
      const mount = document.getElementById("callJitsiMount");
    if (mount) {
      mount.hidden = false;
      mount.style.display = "block";
      mount.style.minHeight = "420px";
      mount.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">'
        + '<button type="button" class="button white" id="callFullscreenBtn">Pantalla completa</button>'
        + '<button type="button" class="button" id="callPopoutBtn">Abrir en ventana</button>'
        + '</div>'
        + '<iframe id="orbyeJitsiFrame" allow="camera; microphone; fullscreen; display-capture; autoplay" allowfullscreen style="width:100%;height:min(85vh,720px);border:0;border-radius:12px;background:#000;min-height:480px" src="' + url + '"></iframe>'
        + '<p class="muted" style="font-size:12px;margin:8px 0 0">Entra con el botón azul de Jitsi. Pantalla completa agranda toda la zona. Para verte a ti: permite cámara en el navegador.</p>';
      callWin = null;
      setTimeout(function(){
        document.getElementById("callFullscreenBtn")?.addEventListener("click", function(){
          /* CALL_FS_V28 */
          var box = mount || document.getElementById("orbyeJitsiFrame");
          if (!box) return;
          try {
            if (document.fullscreenElement) {
              (document.exitFullscreen||document.webkitExitFullscreen).call(document);
            } else if (box.requestFullscreen) box.requestFullscreen();
            else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
          } catch (e) { alert("Pantalla completa no disponible"); }
        });
        document.getElementById("callPopoutBtn")?.addEventListener("click", function(){
          callWin = window.open(url, "orbye_call_" + room, "noopener,noreferrer");
        });
      }, 50);
    } else {
      callWin = window.open(url, "orbye_call_" + room, "noopener,noreferrer");
    }
    }
    const mount = document.getElementById("callJitsiMount");
    if (mount) {
      mount.hidden = false;
      mount.innerHTML = `<div style="padding:14px;border:1px solid #333;border-radius:14px;background:#111;text-align:center">
        <p style="margin:0 0 8px">Sala <b>${code}</b></p>
        <p class="muted" style="margin:0 0 10px">La llamada va en otra ventana. Si no abre, permite ventanas emergentes.</p>
        <button type="button" class="button white" id="callReopenBtn">Reabrir llamada</button>
      </div>`;
      document.getElementById("callReopenBtn")?.addEventListener("click", () => {
        const mount = document.getElementById("callJitsiMount");
    if (mount) {
      mount.hidden = false;
      mount.style.display = "block";
      mount.style.minHeight = "420px";
      mount.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">'
        + '<button type="button" class="button white" id="callFullscreenBtn">Pantalla completa</button>'
        + '<button type="button" class="button" id="callPopoutBtn">Abrir en ventana</button>'
        + '</div>'
        + '<iframe id="orbyeJitsiFrame" allow="camera; microphone; fullscreen; display-capture; autoplay" allowfullscreen style="width:100%;height:min(85vh,720px);border:0;border-radius:12px;background:#000;min-height:480px" src="' + url + '"></iframe>'
        + '<p class="muted" style="font-size:12px;margin:8px 0 0">Entra con el botón azul de Jitsi. Pantalla completa agranda toda la zona. Para verte a ti: permite cámara en el navegador.</p>';
      callWin = null;
      setTimeout(function(){
        document.getElementById("callFullscreenBtn")?.addEventListener("click", function(){
          /* CALL_FS_V28 */
          var box = mount || document.getElementById("orbyeJitsiFrame");
          if (!box) return;
          try {
            if (document.fullscreenElement) {
              (document.exitFullscreen||document.webkitExitFullscreen).call(document);
            } else if (box.requestFullscreen) box.requestFullscreen();
            else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
          } catch (e) { alert("Pantalla completa no disponible"); }
        });
        document.getElementById("callPopoutBtn")?.addEventListener("click", function(){
          callWin = window.open(url, "orbye_call_" + room, "noopener,noreferrer");
        });
      }, 50);
    } else {
      callWin = window.open(url, "orbye_call_" + room, "noopener,noreferrer");
    }
      });
    }
    status("En sala: " + code);
    if (!silent && typeof window.orbyeNotifyFriendsOfCall === "function") {
      window.orbyeNotifyFriendsOfCall(code);
    }
  }
  document.getElementById("callGenCode")?.addEventListener("click", () => genCode());
  document.getElementById("callStartVideo")?.addEventListener("click", () => {
    const code = (document.getElementById("callRoomCode")?.value || "").trim() || genCode();
    showCallSafety(() => openRoom(code, false));
  });
  document.getElementById("callStartAudio")?.addEventListener("click", () => {
    const code = (document.getElementById("callRoomCode")?.value || "").trim() || genCode();
    showCallSafety(() => openRoom(code, true));
  });
  document.getElementById("callJoinVideo")?.addEventListener("click", () => {
    const code = (document.getElementById("callJoinCode")?.value || "").trim();
    if (!code) { status("Pega el código de tu amigo"); return; }
    showCallSafety(() => openRoom(code, false, isCreator()));
  });
  document.getElementById("callHangup")?.addEventListener("click", () => {
    if (callWin && !callWin.closed) try { callWin.close(); } catch (_) {}
    callWin = null;
    const mount = document.getElementById("callJitsiMount");
    if (mount) { mount.innerHTML = ""; mount.hidden = true; }
    status("Saliste");
  });
  document.getElementById("closeCallPanel")?.addEventListener("click", () => {
    const p = document.getElementById("orbyeCallPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
  });
  window.orbyeOpenCall = function() {
    const p = document.getElementById("orbyeCallPanel");
    if (p) { p.hidden = false; p.style.display = "flex"; }
    if (!(document.getElementById("callRoomCode")?.value || "").trim()) genCode();
  };
  document.addEventListener("click", e => {
    if (e.target.closest("#openCallBtn")) {
      e.preventDefault();
      window.orbyeOpenCall();
    }
  });
})();
