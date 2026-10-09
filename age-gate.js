(() => {
  const DOB_KEY = "orbye_user_dob_v1";
  const ADULT_KEY = "orbye_adult_ok_v1";

  function getUser() { return localStorage.getItem("orbye_demo_user"); }

  function calcAge(iso) {
    if (!iso) return 0;
    const d = new Date(iso);
    if (isNaN(d)) return 0;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  }

  window.orbyeIsAdult = function() {
    const u = getUser();
    if (!u) return false;
    try {
      const map = JSON.parse(localStorage.getItem(DOB_KEY) || "{}");
      const age = calcAge(map[u]);
      if (age >= 18) return true;
      if (age > 0 && age < 18) return false;
    } catch {}
    try {
      const prof = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
      if (prof[u] && prof[u].adultOk === true) {
        // only trust if dob also ok
        const map = JSON.parse(localStorage.getItem(DOB_KEY) || "{}");
        return calcAge(map[u]) >= 18;
      }
    } catch {}
    return false;
  };

  window.orbyeRequireAdult = function(msg) {
    if (typeof window.orbyeCanViewAdult === "function" && window.orbyeCanViewAdult()) return true;
    const text = msg || "Contenido 18+. Necesitas verificación de edad (no basta con poner una fecha).";
    if (confirm(text + "\n\n¿Enviar solicitud de verificación a Oryn / staff?")) {
      if (typeof window.orbyeRequestAgeVerification === "function") window.orbyeRequestAgeVerification();
    }
    return false;
  };
  window.orbyeRequireAdult_OLD = function(reason) {
    if (window.orbyeIsAdult()) return true;
    openAgeModal(reason || "Este contenido es solo para mayores de 18 años.");
    return false;
  };

  function openAgeModal(reason) {
    let p = document.getElementById("ageGatePanel");
    if (!p) {
      p = document.createElement("div");
      p.id = "ageGatePanel";
      p.className = "account-panel";
      p.innerHTML = `
        <div class="account-box" style="max-width:420px">
          <button class="close-btn" id="closeAgeGate" type="button">×</button>
          <span class="eyebrow">VERIFICACIÓN DE EDAD</span>
          <h3>Confirma que eres mayor de 18</h3>
          <p class="muted" id="ageGateReason">${reason || ""}</p>
          <label>Fecha de nacimiento
            <input type="date" id="ageGateDob" max="2015-12-31">
          </label>
          <label class="check-row" style="display:flex;gap:8px;align-items:flex-start;margin:12px 0">
            <input type="checkbox" id="ageGateConfirm">
            <span>Declaro que la fecha es real. Los menores no pueden ver Spaces ni perfiles 18+.</span>
          </label>
          <button type="button" class="button white" id="ageGateSubmit">Verificar</button>
          <p id="ageGateMsg" class="guide-message"></p>
        </div>`;
      document.body.appendChild(p);
      document.getElementById("closeAgeGate")?.addEventListener("click", () => {
        p.hidden = true; p.style.display = "none";
      });
      document.getElementById("ageGateSubmit")?.addEventListener("click", () => {
        const u = getUser();
        const msg = document.getElementById("ageGateMsg");
        if (!u) { if (msg) msg.textContent = "Inicia sesión primero"; return; }
        const dob = document.getElementById("ageGateDob")?.value;
        const ok = document.getElementById("ageGateConfirm")?.checked;
        if (!dob || !ok) { if (msg) msg.textContent = "Fecha y casilla obligatorias"; return; }
        const age = calcAge(dob);
        if (age < 18) {
          if (msg) msg.textContent = "Eres menor de 18. No puedes acceder a contenido adulto.";
          const map = JSON.parse(localStorage.getItem(DOB_KEY) || "{}");
          map[u] = dob;
          localStorage.setItem(DOB_KEY, JSON.stringify(map));
          try {
            const prof = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
            prof[u] = prof[u] || {};
            prof[u].adultOk = false;
            localStorage.setItem("orbye_profiles_v1", JSON.stringify(prof));
          } catch {}
          return;
        }
        const map = JSON.parse(localStorage.getItem(DOB_KEY) || "{}");
        map[u] = dob;
        localStorage.setItem(DOB_KEY, JSON.stringify(map));
        try {
          const prof = JSON.parse(localStorage.getItem("orbye_profiles_v1") || "{}");
          prof[u] = prof[u] || {};
          prof[u].adultOk = true;
          localStorage.setItem("orbye_profiles_v1", JSON.stringify(prof));
        } catch {}
        if (msg) msg.textContent = "Verificado: mayor de 18.";
        setTimeout(() => { p.hidden = true; p.style.display = "none"; }, 800);
      });
    }
    const r = document.getElementById("ageGateReason");
    if (r) r.textContent = reason || "";
    p.hidden = false;
    p.style.display = "flex";
  }

  // Block adult content clicks
  document.addEventListener("click", e => {
    const adult = e.target.closest("[data-adult='1'], .space-adult, .ot-item-adult, [data-space-adult]");
    if (!adult) return;
    if (!window.orbyeIsAdult()) {
      e.preventDefault();
      e.stopPropagation();
      window.orbyeRequireAdult = function(msg) {
    if (typeof window.orbyeCanViewAdult === "function" && window.orbyeCanViewAdult()) return true;
    const text = msg || "Contenido 18+. Necesitas verificación de edad (no basta con poner una fecha).";
    if (confirm(text + "\n\n¿Enviar solicitud de verificación a Oryn / staff?")) {
      if (typeof window.orbyeRequestAgeVerification === "function") window.orbyeRequestAgeVerification();
    }
    return false;
  };
  window.orbyeRequireAdult_OLD("Contenido 18+. Verifica tu edad para continuar.");
    }
  }, true);

  window.orbyeOpenAgeGate = openAgeModal;
})();

/* AGE_VERIFY_HARD: 18+ only if staff/Oryn verified — not just birth date */
(function(){
  document.addEventListener("click", function(e){
    const adult = e.target.closest("[data-adult='1'], .space-adult, .ot-item-adult, [data-space-adult]");
    if (!adult) return;
    const verified = localStorage.getItem("orbye_age_verified") === "1";
    const u = localStorage.getItem("orbye_demo_user") || "";
    let list = {};
    try { list = JSON.parse(localStorage.getItem("orbye_age_verified_users_v1")||"{}"); } catch(_){}
    if (verified || list[u]) return; // allow
    e.preventDefault();
    e.stopPropagation();
    if (typeof window.orbyeRequireAdult === "function") {
      window.orbyeRequireAdult("Este contenido es 18+. La fecha de nacimiento sola no basta: hace falta verificación.");
    } else {
      alert("Contenido 18+ bloqueado hasta verificación de edad.");
    }
  }, true);
})();
