/* OrbyE actions — Tienda, Mod, HAKER, Analíticas */
(function () {
  function openOverlay(html) {
    var old = document.getElementById("orbyeActionOverlay");
    if (old) old.remove();
    var p = document.createElement("div");
    p.id = "orbyeActionOverlay";
    p.setAttribute("style", "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:16px");
    p.innerHTML = '<div style="background:#14141e;color:#eee;padding:20px;border-radius:16px;max-width:480px;width:94%;max-height:90vh;overflow:auto;border:1px solid #456">' + html + '</div>';
    document.body.appendChild(p);
    p.addEventListener("click", function (e) { if (e.target === p) p.remove(); });
    var x = p.querySelector("[data-close]");
    if (x) x.addEventListener("click", function () { p.remove(); });
    return p;
  }

  window.orbyeOpenOrbyeStore = function () {
    openOverlay(
      '<h2 style="margin:0 0 8px;color:#fff">Tienda OrbyE</h2>' +
      '<p style="font-size:14px;line-height:1.45">Modelos 3D, accesorios y más. <b>WallPass Ultimate $20</b> desbloquea extras. Ropa y tiendas de usuarios: próximamente.</p>' +
      '<ul style="font-size:13px;line-height:1.6"><li>Astronauta / Robot (3D demo)</li><li>Accesorios HAKER</li><li>Ultimate: dron, capa, neon</li></ul>' +
      '<button data-close type="button" style="margin-top:12px;padding:10px 16px;border:0;border-radius:8px;background:#e11;color:#fff;cursor:pointer;font-weight:700">Cerrar</button>'
    );
  };

  window.orbyeOpenModPanel = function () {
    openOverlay(
      '<h2 style="margin:0 0 8px;color:#fff">Mod panel</h2>' +
      '<p style="font-size:14px">Banear usuarios: 1h / 1 día / 7 días / permanente. Solo admin y moderadores.</p>' +
      '<p style="font-size:12px;opacity:.8">Si ves este panel, el botón <b>sí funciona</b>.</p>' +
      '<button data-close type="button" style="margin-top:12px;padding:10px 16px;border:0;border-radius:8px;background:#e11;color:#fff;cursor:pointer;font-weight:700">Cerrar</button>'
    );
  };

  window.orbyeOpenHakerEvent = function () {
    openOverlay(
      '<h2 style="margin:0 0 8px;color:#fff">Evento HAKER</h2>' +
      '<p style="font-size:14px">Misiones: seguidores y likes. Recompensas: accesorios 3D. Juego limpio · reporta bugs al Staff.</p>' +
      '<button data-close type="button" style="margin-top:12px;padding:10px 16px;border:0;border-radius:8px;background:#e11;color:#fff;cursor:pointer;font-weight:700">Cerrar</button>'
    );
  };

  window.orbyeOpenAnalytics = function () {
    var u = localStorage.getItem("orbye_demo_user") || "—";
    openOverlay(
      '<h2 style="margin:0 0 8px;color:#fff">Analíticas</h2>' +
      '<p style="font-size:14px">Usuario: <b>' + u + '</b></p>' +
      '<p style="font-size:13px;opacity:.85">Vistas, likes y videos se cuentan en este dispositivo. Panel ampliado en próximas actualizaciones.</p>' +
      '<button data-close type="button" style="margin-top:12px;padding:10px 16px;border:0;border-radius:8px;background:#e11;color:#fff;cursor:pointer;font-weight:700">Cerrar</button>'
    );
  };

  function wire() {
    function bind(id, fn) {
      var el = document.getElementById(id);
      if (!el || el.dataset.orbyeBound === "1") return;
      el.dataset.orbyeBound = "1";
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }, true);
    }
    bind("navOrbyeStore", window.orbyeOpenOrbyeStore);
    bind("navModPanel", window.orbyeOpenModPanel);
    bind("navHakerEvent", function () {
      try { sessionStorage.removeItem("haker_bar_hide"); } catch (e) {}
      window.orbyeOpenHakerEvent();
    });
    bind("navAnalytics", window.orbyeOpenAnalytics);
    bind("openOrbyeStore", window.orbyeOpenOrbyeStore);
    bind("openModPanelBtn", window.orbyeOpenModPanel);
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    var el = t.closest ? t.closest("#navOrbyeStore, #navModPanel, #navHakerEvent, #navAnalytics, #openOrbyeStore, #openModPanelBtn") : null;
    if (!el) {
      var txt = (t.textContent || "").trim();
      if (txt.indexOf("Tienda OrbyE") >= 0) { e.preventDefault(); window.orbyeOpenOrbyeStore(); return; }
      if (txt.indexOf("Mod panel") >= 0) { e.preventDefault(); window.orbyeOpenModPanel(); return; }
      if (txt.indexOf("Evento HAKER") >= 0 || txt === "HAKER") { e.preventDefault(); window.orbyeOpenHakerEvent(); return; }
      if (txt.indexOf("Analíticas") >= 0) { e.preventDefault(); window.orbyeOpenAnalytics(); return; }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (el.id === "navOrbyeStore" || el.id === "openOrbyeStore") window.orbyeOpenOrbyeStore();
    else if (el.id === "navModPanel" || el.id === "openModPanelBtn") window.orbyeOpenModPanel();
    else if (el.id === "navHakerEvent") window.orbyeOpenHakerEvent();
    else if (el.id === "navAnalytics") window.orbyeOpenAnalytics();
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
  setInterval(wire, 1500);
  console.log("[OrbyE] orbye-actions.js listo");
})();
