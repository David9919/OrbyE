(() => {
  const FRIENDS_KEY = "orbye_friends_v1";
  /* Cloud friends + DM (Supabase REST) */
  const orbyeSocialCloud = {
    base(){ return (window.ORBYE_SUPABASE_URL||"").replace(/\/$/,""); },
    key(){ return window.ORBYE_SUPABASE_ANON_KEY||window.__orbyeWorkingKey||""; },
    headers(){
      const k=this.key();
      return { apikey:k, Authorization:"Bearer "+k, Accept:"application/json", "Content-Type":"application/json", Prefer:"return=representation" };
    },
    async pullFriends(user){
      const base=this.base(); if(!base||!user) return;
      try{
        const n=encodeURIComponent(user);
        const res=await fetch(base+"/rest/v1/orbye_friends?or=(user_a.eq."+n+",user_b.eq."+n+")&select=*",{headers:this.headers()});
        if(!res.ok) return;
        const rows=await res.json();
        const all=loadJSON(FRIENDS_KEY,{});
        if(!all[user]) all[user]=[];
        rows.forEach(r=>{
          const other = String(r.user_a)===String(user)?r.user_b:r.user_a;
          if(!all[user].includes(other)) all[user].push(other);
        });
        saveJSON(FRIENDS_KEY, all);
      }catch(e){}
    },
    async pushFriend(a,b){
      const base=this.base(); if(!base) return;
      const pair=[a,b].sort().join("__");
      try{
        await fetch(base+"/rest/v1/orbye_friends?on_conflict=pair_id",{
          method:"POST", headers:this.headers(),
          body: JSON.stringify([{ pair_id:pair, user_a:a, user_b:b }])
        });
      }catch(e){}
    },
    async pullDms(a,b){
      const base=this.base(); if(!base) return null;
      try{
        const qa=encodeURIComponent(a), qb=encodeURIComponent(b);
        const res=await fetch(base+"/rest/v1/orbye_dm_messages?or=(and(from_name.eq."+qa+",to_name.eq."+qb+"),and(from_name.eq."+qb+",to_name.eq."+qa+"))&order=created_at.asc&limit=200",{headers:this.headers()});
        if(!res.ok) return null;
        const rows=await res.json();
        return rows.map(r=>({ from:r.from_name, text:r.body, ts:r.created_at?new Date(r.created_at).getTime():Date.now() }));
      }catch(e){ return null; }
    },
    async pushDm(from,to,text){
      const base=this.base(); if(!base) return false;
      try{
        const res=await fetch(base+"/rest/v1/orbye_dm_messages",{
          method:"POST", headers:this.headers(),
          body: JSON.stringify([{ id:"d"+Date.now()+"_"+Math.random().toString(36).slice(2,6), from_name:from, to_name:to, body:text||"" }])
        });
        return res.ok||res.status===201;
      }catch(e){ return false; }
    }
  };
  window.orbyeSocialCloud = orbyeSocialCloud;

  const REQ_KEY = "orbye_friend_requests_v1";
  const DM_KEY = "orbye_dms_v1";

  const panel = document.getElementById("dmPanel");
  const btn = document.getElementById("socialBtn");
  const closeBtn = document.getElementById("closeDm");
  const friendsEl = document.getElementById("dmFriends");
  const reqEl = document.getElementById("dmRequests");
  const chatEl = document.getElementById("dmChat");
  const chatUser = document.getElementById("dmChatUser");
  const messagesEl = document.getElementById("dmMessages");
  const input = document.getElementById("dmInput");
  const sendBtn = document.getElementById("dmSend");

  function getUser() {
    return localStorage.getItem("orbye_demo_user") || null;
  }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function saveJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function friendsOf(user) {
    const all = loadJSON(FRIENDS_KEY, {});
    return all[user] || [];
  }
  function setFriends(user, list) {
    const all = loadJSON(FRIENDS_KEY, {});
    all[user] = list;
    saveJSON(FRIENDS_KEY, all);
  }

  function requests() {
    return loadJSON(REQ_KEY, []);
  }
  function saveRequests(list) {
    saveJSON(REQ_KEY, list);
  }

  function dmThread(a, b) {
    return [a, b].sort().join("__");
  }

  function getDms(a, b) {
    const all = loadJSON(DM_KEY, {});
    return all[dmThread(a, b)] || [];
  }
  async function getDmsMerged(a, b) {
    const local = getDms(a, b);
    const cloud = await orbyeSocialCloud.pullDms(a, b);
    if (!cloud) return local;
    const map = new Map();
    [...local, ...cloud].forEach(m => map.set((m.ts||0)+"|"+m.from+"|"+m.text, m));
    const merged = [...map.values()].sort((x,y)=>(x.ts||0)-(y.ts||0));
    const all = loadJSON(DM_KEY, {});
    all[dmThread(a,b)] = merged;
    saveJSON(DM_KEY, all);
    return merged;
  }
  function pushDm(a, b, text) {
    const all = loadJSON(DM_KEY, {});
    const k = dmThread(a, b);
    if (!all[k]) all[k] = [];
    all[k].push({ from: a, text, ts: Date.now() });
    if (all[k].length > 200) all[k] = all[k].slice(-200);
    saveJSON(DM_KEY, all);
    try { orbyeSocialCloud.pushDm(a, b, text); } catch(e){}
    // mutual messages => friends
    try {
      const thread = all[k] || [];
      const aWrote = thread.some(m => m.from === a);
      const bWrote = thread.some(m => m.from === b);
      if (aWrote && bWrote) {
        const fa = friendsOf(a); if (!fa.includes(b)) { fa.push(b); setFriends(a, fa); }
        const fb = friendsOf(b); if (!fb.includes(a)) { fb.push(a); setFriends(b, fb); }
        orbyeSocialCloud.pushFriend(a, b);
      }
    } catch(e){}
  }


  function isMod() {
    const r = localStorage.getItem("orbye_demo_role");
    if (r === "admin" || r === "moderator") return true;
    // space mods: any space where user is owner/mod
    const user = getUser();
    if (!user) return false;
    try {
      const spaces = JSON.parse(localStorage.getItem("orbye_spaces_v2") || "{}");
      return Object.values(spaces).some(s => s.owner === user || (s.mods || []).includes(user));
    } catch { return false; }
  }

  function showModTab() {
    const tab = document.getElementById("modTabBtn");
    if (tab) tab.hidden = !isMod();
  }

  function refreshBtn() {
    if (btn) btn.hidden = !getUser();
    showModTab();
  }

  function renderFriends() {
    const me = getUser();
    if (!friendsEl || !me) return;
    const list = friendsOf(me);
    if (!list.length) {
      friendsEl.innerHTML = '<p class="muted">Sin amigos aún. Envía solicitudes desde perfiles.</p>';
      return;
    }
    friendsEl.innerHTML = list.map(u =>
      `<div class="dm-row">
        <button type="button" class="user-hit" data-user="${esc(u)}">${esc(u)}</button>
        <button type="button" class="button outline dm-open-chat" data-chat="${esc(u)}">Chat</button>
      </div>`
    ).join("");
  }

  function renderRequests() {
    const me = getUser();
    if (!reqEl || !me) return;
    const list = requests().filter(r => r.to === me && r.status === "pending");
    if (!list.length) {
      reqEl.innerHTML = '<p class="muted">No tienes solicitudes pendientes.</p>';
      return;
    }
    reqEl.innerHTML = list.map(r =>
      `<div class="dm-row">
        <span>${esc(r.from)}</span>
        <button type="button" class="button white dm-accept" data-from="${esc(r.from)}">Aceptar</button>
        <button type="button" class="button outline dm-reject" data-from="${esc(r.from)}">Rechazar</button>
      </div>`
    ).join("");
  }

  function renderChatUserList() {
    const me = getUser();
    if (!chatUser || !me) return;
    const list = friendsOf(me);
    chatUser.innerHTML = list.length
      ? list.map(u => `<option value="${esc(u)}">${esc(u)}</option>`).join("")
      : '<option value="">Sin amigos</option>';
  }

  function renderMessages() {
    const me = getUser();
    const other = chatUser?.value;
    if (!messagesEl || !me || !other) {
      if (messagesEl) messagesEl.innerHTML = '<p class="muted">Elige un amigo.</p>';
      return;
    }
    const msgs = getDms(me, other);
    messagesEl.innerHTML = msgs.length
      ? msgs.map(m => `<div class="dm-msg ${m.from === me ? "mine" : ""}"><b>${esc(m.from)}</b> ${esc(m.text)}</div>`).join("")
      : '<p class="muted">Sin mensajes. Di hola.</p>';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openPanel() {
    if (!getUser()) {
      document.getElementById("accountPanel").hidden = false;
      return;
    }
    if (panel) panel.hidden = false;
    renderFriends();
    renderRequests();
    renderChatUserList();
    renderMessages();
  }

  btn?.addEventListener("click", openPanel);
  closeBtn?.addEventListener("click", () => { if (panel) panel.hidden = true; });
  panel?.addEventListener("click", e => { if (e.target === panel) panel.hidden = true; });

  document.querySelectorAll(".dm-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".dm-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.dataset.dmTab;
      const modPane = document.getElementById("modMsgPane");
      if (friendsEl) friendsEl.hidden = name !== "friends";
      if (reqEl) reqEl.hidden = name !== "requests";
      if (chatEl) chatEl.hidden = name !== "chat";
      if (modPane) modPane.hidden = name !== "mod";
      if (name === "friends") renderFriends();
      if (name === "requests") renderRequests();
      if (name === "chat") { renderChatUserList(); renderMessages(); }
    });
  });

  document.getElementById("modMsgSend")?.addEventListener("click", () => {
    if (!isMod()) return;
    const to = (document.getElementById("modMsgTo")?.value || "").trim();
    const text = (document.getElementById("modMsgText")?.value || "").trim();
    const st = document.getElementById("modMsgStatus");
    if (!to || !text) {
      if (st) { st.textContent = "Usuario y mensaje requeridos."; st.style.color = "#f88"; }
      return;
    }
    // Store as notification without sender name
    try {
      const KEY = "orbye_notifications_v1";
      const all = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (!all[to]) all[to] = [];
      all[to].unshift({
        id: crypto.randomUUID(),
        text: "Mensaje de los moderadores: " + text,
        type: "mod",
        href: "",
        ts: Date.now(),
        read: false,
        anonymousMod: true
      });
      if (all[to].length > 60) all[to].length = 60;
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
    if (typeof window.orbyeNotify === "function") {
      // orbyeNotify skips self; use direct storage above
    }
    if (st) { st.textContent = 'Enviado. El usuario verá solo "Mensaje de los moderadores".'; st.style.color = '#6dce8a'; }
    const ta = document.getElementById("modMsgText");
    if (ta) ta.value = "";
  });


  friendsEl?.addEventListener("click", e => {
    const c = e.target.closest(".dm-open-chat");
    if (!c) return;
    document.querySelectorAll(".dm-tab").forEach(t => t.classList.toggle("active", t.dataset.dmTab === "chat"));
    if (friendsEl) friendsEl.hidden = true;
    if (reqEl) reqEl.hidden = true;
    if (chatEl) chatEl.hidden = false;
    renderChatUserList();
    if (chatUser) chatUser.value = c.dataset.chat;
    renderMessages();
  });

  reqEl?.addEventListener("click", e => {
    const me = getUser();
    if (!me) return;
    const acc = e.target.closest(".dm-accept");
    const rej = e.target.closest(".dm-reject");
    if (acc) {
      const from = acc.dataset.from;
      let reqs = requests().map(r => {
        if (r.from === from && r.to === me && r.status === "pending") return { ...r, status: "accepted" };
        return r;
      });
      saveRequests(reqs);
      const fa = friendsOf(me);
      const fb = friendsOf(from);
      if (!fa.includes(from)) fa.push(from);
      if (!fb.includes(me)) fb.push(me);
      setFriends(me, fa);
      setFriends(from, fb);
      if (typeof window.orbyeNotify === "function") {
        window.orbyeNotify(from, me + " aceptó tu solicitud de amistad", "friend", "#comunidad");
      }
      renderRequests();
      renderFriends();
    }
    if (rej) {
      const from = rej.dataset.from;
      let reqs = requests().map(r => {
        if (r.from === from && r.to === me && r.status === "pending") return { ...r, status: "rejected" };
        return r;
      });
      saveRequests(reqs);
      renderRequests();
    }
  });

  chatUser?.addEventListener("change", renderMessages);
  sendBtn?.addEventListener("click", () => {
    const me = getUser();
    const other = chatUser?.value;
    const text = (input?.value || "").trim();
    if (!me || !other || !text) return;
    pushDm(me, other, text);
    if (input) input.value = "";
    renderMessages();
    if (typeof window.orbyeNotify === "function") {
      window.orbyeNotify(other, me + " te envió un mensaje privado", "dm", "#comunidad");
    }
  });
  input?.addEventListener("keydown", e => {
    if (e.key === "Enter") sendBtn?.click();
  });

  // Friend request from public profile
  window.orbyeSendFriendRequest = function (toUser) {
    const me = getUser();
    if (!me || !toUser || me === toUser) return false;
    if (friendsOf(me).includes(toUser)) return false;
    const reqs = requests();
    if (reqs.some(r => r.from === me && r.to === toUser && r.status === "pending")) return false;
    reqs.push({ from: me, to: toUser, status: "pending", ts: Date.now() });
    saveRequests(reqs);
    if (typeof window.orbyeNotify === "function") {
      window.orbyeNotify(toUser, me + " te envió solicitud de amistad", "friend", "#comunidad");
    }
    return true;
  };

  window.addEventListener("orbye-login", refreshBtn);
  refreshBtn();
})();

  setTimeout(function(){
    const u = getUser();
    if (u) orbyeSocialCloud.pullFriends(u);
  }, 1500);
  setInterval(function(){
    const u = getUser();
    if (u) orbyeSocialCloud.pullFriends(u);
  }, 30000);
