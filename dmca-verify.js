(() => {
  const KEY = "orbye_dmca_verified_v1";
  function getUser() { return localStorage.getItem("orbye_demo_user"); }
  function open() {
    // close any mini leftover
    document.querySelectorAll("#dmcaMiniPanel, .dmca-mini, #dmcaFloat").forEach(el => {
      el.hidden = true;
      el.style.display = "none";
    });
    const p = document.getElementById("dmcaVerifyPanel");
    if (p) { p.hidden = false; p.style.display = "flex"; }
  }
  document.getElementById("closeDmcaVerify")?.addEventListener("click", () => {
    const p = document.getElementById("dmcaVerifyPanel");
    if (p) { p.hidden = true; p.style.display = "none"; }
  });
  // All DMCA entry points → one panel
  ["openDmcaMini", "openDmcaMini2", "openDmca", "dmcaOpenBtn", "openDmcaBtn", "openDmcaBtn2"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", e => {
      e.preventDefault();
      open();
    });
  });
  document.querySelectorAll("[data-open-dmca], a[href='#dmca']").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      open();
    });
  });
  document.getElementById("dmcaVerifySubmit")?.addEventListener("click", () => {
    const msg = document.getElementById("dmcaVerifyMsg");
    const u = getUser();
    if (!u) { if (msg) msg.textContent = "Inicia sesión"; return; }
    const name = (document.getElementById("dmcaLegalName")?.value || "").trim();
    const email = (document.getElementById("dmcaEmail")?.value || "").trim();
    const phone = (document.getElementById("dmcaPhone")?.value || "").trim();
    const url = (document.getElementById("dmcaContentUrl")?.value || "").trim();
    const work = (document.getElementById("dmcaWorkDesc")?.value || "").trim();
    const sig = (document.getElementById("dmcaSignature")?.value || "").trim();
    const g1 = document.getElementById("dmcaGoodFaith")?.checked;
    const g2 = document.getElementById("dmcaUnderPenalty")?.checked;
    const g3 = document.getElementById("dmcaNoFalse")?.checked;
    if (name.length < 3 || !email.includes("@") || url.length < 3 || work.length < 20) {
      if (msg) msg.textContent = "Completa nombre, email, URL y descripción (mín. 20 caracteres).";
      return;
    }
    if (sig.toLowerCase() !== name.toLowerCase()) {
      if (msg) msg.textContent = "La firma debe coincidir con tu nombre legal.";
      return;
    }
    if (!g1 || !g2 || !g3) {
      if (msg) msg.textContent = "Debes aceptar las tres declaraciones de seguridad.";
      return;
    }
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    list.unshift({
      id: String(Date.now()),
      by: u,
      name, email, phone, url, work, sig,
      status: "pending_review",
      ts: Date.now()
    });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
    if (typeof window.orbyeNotify === "function") {
      window.orbyeNotify("DavidAvila", "DMCA verificado de @" + u + " — revisar", "dmca", "#staff");
    }
    if (msg) msg.textContent = "Enviado. DavidAvila / moderación revisará antes de eliminar. Reportes falsos no prosperan.";
    setTimeout(() => {
      const p = document.getElementById("dmcaVerifyPanel");
      if (p) { p.hidden = true; p.style.display = "none"; }
    }, 2200);
  });
  window.orbyeOpenDmcaVerify = open;
})();
