
/* SAMURAY_ORYN_INJECT */
(function(){
  var BLURB = " Eres Oryn de OrbyE. Samuray Del Norte (https://samuray-del-norte.vercel.app) es la comunidad LNF oficial ligada a OrbyE. Si te preguntan por Samuray, LNF o Light No Fire, da ese enlace y di que pueden conectar su cuenta OrbyE con el botón ⚔ Samuray en OrbyE.";
  var _fetch = window.fetch;
  if(!_fetch || _fetch.__samuray) return;
  window.fetch = function(url, opts){
    try {
      if(opts && opts.body && typeof opts.body==="string" && (String(url).indexOf("oryn")>=0 || String(url).indexOf("groq")>=0 || String(url).indexOf("/api/")>=0)){
        var j = JSON.parse(opts.body);
        if(j && Array.isArray(j.messages)){
          var hasSys = false;
          j.messages = j.messages.map(function(m){
            if(m && m.role==="system"){ hasSys=true; m.content = (m.content||"") + BLURB; }
            return m;
          });
          if(!hasSys) j.messages.unshift({ role:"system", content: BLURB });
          opts = Object.assign({}, opts, { body: JSON.stringify(j) });
        }
      }
    } catch(e){}
    return _fetch.apply(this, arguments);
  };
  window.fetch.__samuray = true;
})();

/* SAMURAY_ORYN_KNOW */
var ORYN_SAMURAY_BLURB = "Samuray Del Norte: https://samuray-del-norte.vercel.app — comunidad Light No Fire, parte de OrbyE. Enlace oficial.";

/* ORYN_STUDIO_V163 */
function orynSystemWithStudio(base){
  base = (base||"") + " Conoces Samuray Del Norte (https://samuray-del-norte.vercel.app), comunidad LNF de OrbyE. Si preguntan, da ese enlace.";

  if(window.__ORYN_STUDIO_HINT) return (base||"")+"\n\n"+window.__ORYN_STUDIO_HINT;
  return base||"";
}

var ORYN_STUDIO = false;
function orynOpenStudio(){ window.orynOpenStudio = orynOpenStudio;
  ORYN_STUDIO = true;
  var c = typeof activeChat==="function" ? activeChat() : null;
  if(!c) return;
  var intro = "Modo **Oryn Studio** activado.\\n\\nPuedo ayudarte a:\\n- Crear juegos HTML5 (carreras, acción, plataformas, puzzles, etc.)\\n- Generar código HTML/CSS/JS completo\\n- Mejorar un juego que ya tengas\\n- Diseñar mecánicas y niveles\\n\\nDime qué quieres crear. Usa ▶ Vista previa cuando genere HTML.";
  c.messages = c.messages || [];
  c.messages.push({role:"assistant", content: intro});
  if(typeof persist==="function") persist();
  if(typeof renderMessages==="function") renderMessages();
  // prepend system hint for next sends
  window.__ORYN_STUDIO_HINT = "Estás en Oryn Studio. Prioriza código HTML5 de juegos completo y funcional (canvas o DOM). Incluye todo en un solo bloque ```html. Juegos jugables: controles claros, score, game over. Si piden juego, entrega HTML listo para vista previa.";
}


function orynLimitClock(kind){
  // kind: "chat" | "img"
  var end = new Date();
  end.setHours(24,0,0,0); // next midnight local
  var wrap = document.createElement("div");
  wrap.style.cssText = "margin:12px 0;padding:16px;border-radius:14px;background:#12161f;border:1px solid #2a3a55;text-align:center";
  wrap.innerHTML = "<div style='color:#f86;font-weight:800;margin-bottom:8px'>Límite de "+(kind==="img"?"imágenes":"mensajes")+" alcanzado</div>"+
    "<div style='color:#9ab;font-size:12px;margin-bottom:10px'>Se reinicia a medianoche · o usa código creador / WallPass</div>"+
    "<div class='orynLimClock' style='font-size:28px;font-weight:900;letter-spacing:2px;color:#2a5cff;font-variant-numeric:tabular-nums'>--:--:--</div>";
  function tick(){
    var now = new Date();
    var ms = end - now;
    if(ms < 0){ wrap.querySelector(".orynLimClock").textContent = "00:00:00"; return; }
    var s = Math.floor(ms/1000);
    var h = Math.floor(s/3600); s%=3600;
    var m = Math.floor(s/60); s%=60;
    var pad = function(n){ return (n<10?"0":"")+n; };
    var el = wrap.querySelector(".orynLimClock");
    if(el) el.textContent = pad(h)+":"+pad(m)+":"+pad(s);
  }
  tick();
  var id = setInterval(tick, 1000);
  wrap._timer = id;
  return wrap;
}

/* QUOTA_RESET_V153 — reinicia contadores a 70/10 */
(function(){
  try {
    var k = "orbye_oryn_usage_v2";
    var prev = localStorage.getItem("orbye_oryn_reset_flag_v153");
    if(prev !== "1"){
      localStorage.removeItem("orbye_oryn_usage_v1");
      localStorage.removeItem("orbye_oryn_quota_v1");
      localStorage.removeItem("oryn_usage_v1");
      localStorage.setItem(k, JSON.stringify({chat:0,img:0,day:new Date().toDateString()}));
      localStorage.setItem("orbye_oryn_reset_flag_v153", "1");
      console.log("[OrbyE] Oryn quotas reset 70/10");
    }
  } catch(e){}
})();
/* FORCE_LIMITS_1512 */
window.ORYN_PLANS = {
  free:  { name: "Gratis", price: 0, chatDay: 70, imgDay: 10, label: "Básico" },
  go:    { name: "Oryn Go", price: 8, chatDay: 200, imgDay: 30, label: "Más" },
  plus:  { name: "Oryn Plus", price: 20, chatDay: 800, imgDay: 100, label: "Avanzado" },
  pro:   { name: "Oryn Pro", price: 100, chatDay: 5000, imgDay: 500, label: "Máximo" }
};
if(typeof window.orbyeOrynQuota === "function"){
  var _oq = window.orbyeOrynQuota;
  window.orbyeOrynQuota = function(){
    var q = _oq();
    if(q && q.plan && q.planId==="free"){
      q.plan.chatDay = 70; q.plan.imgDay = 10;
      q.chatLeft = Math.max(0, 70 - (q.chatUsed||0));
      q.imgLeft = Math.max(0, 10 - (q.imgUsed||0));
    }
    return q;
  };
}

window.ORYN_GAME_SNAKE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Snake OrbyE</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0c12;color:#e8f0ff;font-family:system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
  h1{font-size:18px;letter-spacing:1px}
  #wrap{position:relative}
  canvas{background:#111827;border:2px solid #2a5cff;border-radius:12px;display:block;box-shadow:0 0 40px #2a5cff44}
  #ui{display:flex;gap:16px;align-items:center;font-size:14px}
  #score{color:#9cf;font-weight:800}
  button{padding:10px 18px;border:0;border-radius:10px;background:#2a5cff;color:#fff;font-weight:800;cursor:pointer}
  #over{display:none;position:absolute;inset:0;background:#000a;border-radius:12px;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#fff}
  #over.show{display:flex}
  .hint{font-size:12px;color:#6a7a99}
</style>
</head>
<body>
  <h1>🐍 Snake · OrbyE</h1>
  <div id="ui"><span>Puntuación: <span id="score">0</span></span><button type="button" id="restart">Reiniciar</button></div>
  <div id="wrap">
    <canvas id="c" width="400" height="400"></canvas>
    <div id="over"><div style="font-size:22px;font-weight:800">Game Over</div><button type="button" id="again">Jugar otra vez</button></div>
  </div>
  <p class="hint">Flechas o WASD · Espacio = pausa</p>
<script>
(function(){
  var canvas=document.getElementById("c"), ctx=canvas.getContext("2d");
  var grid=20, size=canvas.width/grid;
  var snake, dir, nextDir, food, score, alive, paused, timer;
  function randCell(){ return {x:Math.floor(Math.random()*grid), y:Math.floor(Math.random()*grid)}; }
  function placeFood(){
    do { food=randCell(); } while(snake.some(function(s){return s.x===food.x&&s.y===food.y;}));
  }
  function reset(){
    snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir={x:1,y:0}; nextDir={x:1,y:0};
    score=0; alive=true; paused=false;
    document.getElementById("score").textContent="0";
    document.getElementById("over").classList.remove("show");
    placeFood();
    if(timer) clearInterval(timer);
    timer=setInterval(tick, 110);
    draw();
  }
  function tick(){
    if(!alive||paused) return;
    dir=nextDir;
    var head={x:snake[0].x+dir.x, y:snake[0].y+dir.y};
    if(head.x<0||head.y<0||head.x>=grid||head.y>=grid) return die();
    if(snake.some(function(s){return s.x===head.x&&s.y===head.y;})) return die();
    snake.unshift(head);
    if(head.x===food.x&&head.y===food.y){
      score++; document.getElementById("score").textContent=String(score);
      placeFood();
    } else snake.pop();
    draw();
  }
  function die(){
    alive=false;
    document.getElementById("over").classList.add("show");
    clearInterval(timer);
  }
  function draw(){
    ctx.fillStyle="#111827"; ctx.fillRect(0,0,canvas.width,canvas.height);
    // grid faint
    ctx.strokeStyle="#1a2233";
    for(var i=0;i<=grid;i++){
      ctx.beginPath(); ctx.moveTo(i*size,0); ctx.lineTo(i*size,canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*size); ctx.lineTo(canvas.width,i*size); ctx.stroke();
    }
    // food
    ctx.fillStyle="#ef4444";
    ctx.beginPath();
    ctx.arc(food.x*size+size/2, food.y*size+size/2, size*0.35, 0, Math.PI*2);
    ctx.fill();
    // snake
    snake.forEach(function(s,i){
      ctx.fillStyle=i===0?"#22d3ee":"#2a5cff";
      ctx.fillRect(s.x*size+1, s.y*size+1, size-2, size-2);
    });
  }
  function setDir(nx,ny){
    if(dir.x===-nx&&dir.y===-ny) return;
    nextDir={x:nx,y:ny};
  }
  document.addEventListener("keydown", function(e){
    var k=e.key;
    if(k==="ArrowUp"||k==="w"||k==="W") setDir(0,-1);
    else if(k==="ArrowDown"||k==="s"||k==="S") setDir(0,1);
    else if(k==="ArrowLeft"||k==="a"||k==="A") setDir(-1,0);
    else if(k==="ArrowRight"||k==="d"||k==="D") setDir(1,0);
    else if(k===" "||k==="Spacebar"){ paused=!paused; e.preventDefault(); }
  });
  document.getElementById("restart").onclick=reset;
  document.getElementById("again").onclick=reset;
  reset();
})();
</script>
</body>
</html>`;

/* ORYN_QUOTAS_V89 */
window.ORYN_PLANS = {
  free:     { name: "Gratis",   price: 0,  chatDay: 70,  imgDay: 10,  label: "Uso básico" },
  go:       { name: "Oryn Go",  price: 8,  chatDay: 200, imgDay: 30, label: "Más mensajes e imágenes" },
  plus:     { name: "Oryn Plus",price: 20, chatDay: 800, imgDay: 100,label: "Uso avanzado" },
  pro:      { name: "Oryn Pro", price: 100,chatDay: 5000,imgDay: 1000,label: "Máximo rendimiento" }
};
window.orbyeGetOrynPlan = function(){
  try {
    var p = localStorage.getItem("orbye_oryn_plan") || "free";
    // WallPass membership can unlock higher
    var wp = localStorage.getItem("orbye_wallpass_tier") || "";
    if(wp === "ultimate" || wp === "pro") p = "pro";
    else if(wp === "premium" || wp === "plus") p = p === "free" ? "plus" : p;
    else if(wp === "go") p = p === "free" ? "go" : p;
    if(!window.ORYN_PLANS[p]) p = "free";
    return p;
  } catch(e){ return "free"; }
};
window.orbyeOrynQuota = function(){
  var planId = window.orbyeGetOrynPlan();
  var plan = window.ORYN_PLANS[planId];
  var day = new Date().toISOString().slice(0,10);
  var key = "orbye_oryn_usage_" + day;
  var usage = { chat: 0, img: 0, day: day };
  try { usage = JSON.parse(localStorage.getItem(key)||"null") || usage; } catch(e){}
  if(usage.day !== day) usage = { chat: 0, img: 0, day: day };
  return {
    planId: planId,
    plan: plan,
    chatUsed: usage.chat||0,
    imgUsed: usage.img||0,
    chatLeft: Math.max(0, plan.chatDay - (usage.chat||0)),
    imgLeft: Math.max(0, plan.imgDay - (usage.img||0)),
    usageKey: key,
    usage: usage
  };
};
window.orbyeOrynUse = function(kind){
  var q = window.orbyeOrynQuota();
  if(kind === "chat") q.usage.chat = (q.usage.chat||0) + 1;
  if(kind === "img") q.usage.img = (q.usage.img||0) + 1;
  try { localStorage.setItem(q.usageKey, JSON.stringify(q.usage)); } catch(e){}
  return window.orbyeOrynQuota();
};


/* ORYN_V99 — panel completo + preview HTML seguro */
window.ORYN_LOGO = "/oryn-logo.png";
window.__openOryn = function(){
  try {
    var old = document.getElementById("ORYN_PANEL_V99");
    if(old){ old.style.setProperty("display","flex","important"); return; }
    var LS_KEY = "orbye_oryn_chats_v1";
    function loadChats(){ try { return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); } catch(e){ return []; } }
    function saveChats(list){ try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch(e){} }
    function uid(){ return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
    var chats = loadChats();
    var activeId = chats.length ? chats[0].id : null;
    if(!chats.length){
      activeId = uid();
      chats = [{ id: activeId, title: "Nueva conversación", messages: [], updated: Date.now() }];
      saveChats(chats);
    }
    var avatar = localStorage.getItem("orbye_demo_avatar") || localStorage.getItem("orbye_profile_photo") || "";
    var uname = localStorage.getItem("orbye_demo_user") || "Tú";
    var logo = window.ORYN_LOGO || "";

    var r = document.createElement("div");
    r.id = "ORYN_PANEL_V99";
    r.setAttribute("style","position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(0,0,0,.93)!important;display:flex!important;align-items:stretch!important;justify-content:center!important");
    r.innerHTML =
      "<div style='width:min(960px,100vw);height:min(92vh,100%);margin:auto;background:#0b0d12;border:1px solid #2a3344;border-radius:16px;display:flex;overflow:hidden;font-family:system-ui,sans-serif'>"+
      "<div style='width:240px;min-width:200px;background:#0a0c10;border-right:1px solid #222;display:flex;flex-direction:column'>"+
      "<div style='padding:14px 12px;border-bottom:1px solid #222;display:flex;align-items:center;gap:8px'>"+
      (logo?"<img src='"+logo+"' style='width:32px;height:32px;border-radius:50%;object-fit:cover;background:#000;border:1px solid #333'>":"")+
      "<b style='color:#e8f0ff;font-size:15px'>Oryn</b>"+
      "<button type='button' id='ox99' style='margin-left:auto;border:0;background:#3a1520;color:#f88;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px'>×</button></div>"+
      "<button type='button' id='orynNew' style='margin:10px;padding:10px;border-radius:10px;border:1px solid #345;background:#12203a;color:#9cf;font-weight:700;cursor:pointer'>＋ Nueva conversación</button>"+
      "<div style='padding:0 10px 8px;display:flex;flex-direction:column;gap:4px'>"+
      "<button type='button' class='orynNavBtn' data-view='chats' style='text-align:left;padding:8px 10px;border:0;border-radius:8px;background:#1a2840;color:#e8f0ff;cursor:pointer;font-size:13px'>💬 Conversaciones</button>"+
      "<button type='button' class='orynNavBtn' data-view='imagine' style='text-align:left;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:#9ab;cursor:pointer;font-size:13px'>✦ Imagine</button>"+
      "<button type='button' class='orynNavBtn' data-view='lib' style='text-align:left;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:#9ab;cursor:pointer;font-size:13px'>📚 Biblioteca</button>"+
      "</div>"+
      "<div id='orynChatList' style='flex:1;overflow:auto;padding:6px'></div>"+
      "<div style='padding:10px;font-size:11px;color:#556;border-top:1px solid #222'>Chats en este dispositivo</div></div>"+
      "<div style='flex:1;display:flex;flex-direction:column;min-width:0'>"+
      "<div style='padding:12px 16px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px'>"+
      "<div style='flex:1;min-width:0'><div id='orynTitle' style='color:#e8f0ff;font-weight:700;font-size:14px'>Oryn</div>"+
      "<div id='orynQuotaBar' style='font-size:11px;color:#6a7a99;margin-top:2px'>—</div></div>"+
      "<button type='button' id='orynDel' style='border:0;background:#2a1520;color:#f88;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700'>Borrar</button></div>"+
      "<div id='om99' style='flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px'></div>"+
      "<div style='padding:10px 14px;border-top:1px solid #222;background:#0e1220'>"+
      "<div id='orynPreview99' style='display:none;margin-bottom:8px'></div>"+
      "<div style='display:flex;gap:8px;align-items:flex-end'>"+
      "<button type='button' id='opl99' style='padding:10px;background:#1a2a40;color:#9cf;border:1px solid #456;border-radius:12px;cursor:pointer'>📎</button>"+
      "<input type='file' id='of99' accept='image/*' style='display:none'>"+
      "<textarea id='oi99' rows='1' style='flex:1;padding:12px;border-radius:12px;border:1px solid #345;background:#111;color:#fff;font-size:15px;resize:none;max-height:120px;font-family:inherit' placeholder='Mensaje a Oryn…'></textarea>"+
      "<button type='button' id='os99' style='padding:12px 18px;background:#2a5cff;color:#fff;border:0;border-radius:12px;font-weight:800;cursor:pointer'>Enviar</button>"+
      "</div></div></div></div>";
    document.body.appendChild(r);
    var box = document.getElementById("om99");
    var pendingImg = null;

    function activeChat(){
      for(var i=0;i<chats.length;i++) if(chats[i].id===activeId) return chats[i];
      return chats[0];
    }
    function refreshQuota(){
      var q = window.orbyeOrynQuota ? window.orbyeOrynQuota() : null;
      var el = document.getElementById("orynQuotaBar");
      if(!el || !q) return;
      var cAct = activeChat();
      if(cAct && cAct.creatorUnlock){
        el.innerHTML = "<span style='color:#9cf'>Creador</span> · <b style='color:#8f8'>Sin límite</b> chat e imágenes en este chat";
      } else {
        el.innerHTML = "<span style='color:#9cf'>"+q.plan.name+"</span> · Chat <b style='color:#cde'>"+q.chatLeft+"</b>/"+q.plan.chatDay+
        " · Imágenes <b style='color:#cde'>"+q.imgLeft+"</b>/"+q.plan.imgDay+" hoy";
      }
    }
    function renderList(){
      var list = document.getElementById("orynChatList");
      list.innerHTML = "";
      chats.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
      chats.forEach(function(c){
        var b = document.createElement("button");
        b.type = "button";
        b.style.cssText = "width:100%;text-align:left;padding:10px 12px;border:0;border-radius:8px;cursor:pointer;margin-bottom:4px;background:"+(c.id===activeId?"#1a2840":"transparent")+";color:"+(c.id===activeId?"#fff":"#9ab");
        b.innerHTML = "<div style='font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>"+(c.title||"Chat")+"</div>"+
          "<div style='font-size:10px;color:#667;margin-top:2px'>"+new Date(c.updated||Date.now()).toLocaleString()+"</div>";
        b.onclick = function(){ activeId=c.id; renderList(); renderMessages(); };
        list.appendChild(b);
      });
    }
    function extractHtml(raw){
      var code = null;
      function wrapBareJs(js){
        return "<!DOCTYPE html><html><head><meta charset=UTF-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><style>html,body{margin:0;background:#111;color:#eee;font-family:system-ui}</style></head><body><div id=root></div><script>\n"+js+"\n</"+"script></body></html>";
      }
      var m = String(raw).match(/```(?:html|HTML)?\s*([\s\S]*?)```/);
      if(m) code = m[1].trim();
      if(!code){
        var m2 = String(raw).match(/```(?:html|HTML)?\s*([\s\S]+)/);
        if(m2 && /<!DOCTYPE|<html[\s>]|<canvas/i.test(m2[1])) code = m2[1].replace(/```\s*$/,"").trim();
      }
      if(!code && /<!DOCTYPE\s+html|<html[\s>]|<canvas[\s>]/i.test(raw)){
        var ix = String(raw).search(/<!DOCTYPE\s+html|<html[\s>]|<canvas[\s>]/i);
        code = String(raw).slice(ix).trim().replace(/\n```[\s\S]*$/,"").trim();
      }
      if(!code){
        var mj = String(raw).match(/```(?:javascript|js)\s*([\s\S]*?)```/i);
        if(mj && mj[1] && mj[1].length>30) code = wrapBareJs(mj[1].trim());
      }
      return code;
    }
    function bubbleEl(role, text, imgSrc){
      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:10px;align-items:flex-start;"+(role==="user"?"flex-direction:row-reverse;":"");
      var av = document.createElement("div");
      if(role==="user"){
        av.innerHTML = avatar
          ? "<img src=\""+avatar.replace(/"/g,"")+"\" style='width:32px;height:32px;border-radius:50%;object-fit:cover;background:#000'>"
          : "<div style='width:30px;height:30px;border-radius:50%;background:#234;color:#9cf;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800'>"+(uname[0]||"?").toUpperCase()+"</div>";
      } else {
        av.innerHTML = logo
          ? "<img src=\""+logo+"\" style='width:32px;height:32px;border-radius:50%;object-fit:cover;background:#000'>"
          : "<div style='width:30px;height:30px;border-radius:50%;background:#1a2a4a;color:#9cf;display:flex;align-items:center;justify-content:center'>✦</div>";
      }
      var msg = document.createElement("div");
      msg.style.cssText = "max-width:75%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;color:#e8eefc;background:"+(role==="user"?"#1a3050":"#151a28");
      if(text){
        var code = extractHtml(text);
        if(code && code.length > 40){
          var before = String(text).slice(0, String(text).indexOf(code)).replace(/```html/ig,"").replace(/```/g,"").trim();
          if(before){ var tb=document.createElement("div"); tb.style.whiteSpace="pre-wrap"; tb.textContent=before; msg.appendChild(tb); }
          var pre=document.createElement("pre");
          pre.style.cssText="background:#0a0e18;padding:10px;border-radius:8px;overflow:auto;max-height:120px;font-size:11px;margin:8px 0";
          pre.textContent=code.slice(0,2000)+(code.length>2000?"\n…":"");
          msg.appendChild(pre);
          var prevWrap=document.createElement("div");
          prevWrap.style.cssText="margin-top:8px;border:1px solid #345;border-radius:12px;overflow:hidden;background:#0a0c12";
          var bar=document.createElement("div");
          bar.style.cssText="display:flex;gap:6px;padding:6px 8px;background:#151a28;flex-wrap:wrap";
          var play=document.createElement("button");
          play.type="button"; play.textContent="▶ Vista previa";
          play.style.cssText="padding:8px 14px;border:0;border-radius:8px;background:#2a5cff;color:#fff;font-weight:800;cursor:pointer;font-size:13px";
          var full=document.createElement("button");
          full.type="button"; full.textContent="⛶ Completa";
          var dl=document.createElement("button");
          dl.type="button"; dl.textContent="⬇ Archivo .html";
          dl.style.cssText="padding:8px 12px;border:0;border-radius:8px;background:#1a3a2a;color:#8f8;cursor:pointer;font-size:12px";

          full.style.cssText="padding:8px 12px;border:0;border-radius:8px;background:#1a2a40;color:#9cf;cursor:pointer;font-size:12px";
          var stop=document.createElement("button");
          stop.type="button"; stop.textContent="Cerrar";
          stop.style.cssText="padding:8px 12px;border:0;border-radius:8px;background:#3a1520;color:#f88;cursor:pointer;font-size:12px;display:none";
          bar.appendChild(play); bar.appendChild(full); bar.appendChild(dl);
          var pub=document.createElement('button');
          pub.type='button'; pub.textContent='🎮 Subir a Open games';
          pub.style.cssText='padding:8px 12px;border:0;border-radius:8px;background:#5b21b6;color:#fff;cursor:pointer;font-size:12px;font-weight:700';
          bar.appendChild(pub); bar.appendChild(stop);
          pub.onclick=function(){
            var src=typeof fullDoc==='function'?fullDoc(code):code;
            var title=(code.match(/<title>(.*?)<\/title>/i)||[])[1]||'Juego Oryn';
            if(window.orbyePublishGame){
              window.orbyePublishGame({name:title,html:src,desc:'Publicado desde Oryn',cat:'html'});
              alert('Publicado en Open games.OrbyE: '+title);
            } else alert('Open games no está cargado');
          };
          dl.onclick=function(){
            var blob=new Blob([fullDoc(code)],{type:"text/html;charset=utf-8"});
            var a=document.createElement("a"); a.href=URL.createObjectURL(blob);
            a.download=(code.match(/<title>(.*?)<\/title>/i)||[])[1]||"oryn-file";
            if(!/\.html$/i.test(a.download)) a.download+=".html";
            a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
          };
          prevWrap.appendChild(bar);
          var frameBox=document.createElement("div");
          frameBox.style.cssText="display:none;height:320px;background:#000";
          prevWrap.appendChild(frameBox);
          function fullDoc(c){
            if(/^\s*<!DOCTYPE|^\s*<html/i.test(c)) return c;
            return "<!DOCTYPE html><html><head><meta charset=UTF-8><style>html,body{margin:0;background:#111;color:#fff}</style></"+"head><"+"body>"+c+"</"+"body></"+"html>";
          }
          play.onclick=function(){
            frameBox.style.display="block"; stop.style.display="inline-block"; frameBox.innerHTML="";
            var ifr=document.createElement("iframe");
            ifr.setAttribute("sandbox","allow-scripts allow-same-origin allow-pointer-lock allow-forms");
            ifr.style.cssText="width:100%;height:100%;border:0;background:#000";
            frameBox.appendChild(ifr);
            ifr.srcdoc = fullDoc(code);
            try{
              var lib=JSON.parse(localStorage.getItem("orbye_oryn_lib")||"[]");
              lib.unshift({id:Date.now(),type:"html",title:(code.match(/<title>(.*?)<\/title>/i)||[])[1]||"HTML Oryn",code:fullDoc(code),at:Date.now()});
              localStorage.setItem("orbye_oryn_lib",JSON.stringify(lib.slice(0,40)));
            }catch(e){}
          };
          stop.onclick=function(){ frameBox.style.display="none"; frameBox.innerHTML=""; stop.style.display="none"; };
          full.onclick=function(){ var w=window.open("","_blank"); if(w){ w.document.open(); w.document.write(fullDoc(code)); w.document.close(); } };
          msg.appendChild(prevWrap);
        } else {
          var t=document.createElement("div"); t.style.whiteSpace="pre-wrap"; t.textContent=text; msg.appendChild(t);
        }
      }
      if(imgSrc){
        var im=document.createElement("img"); im.src=imgSrc;
        im.style.cssText="max-width:100%;border-radius:10px;margin-top:8px;display:block";
        msg.appendChild(im);
      }
      if(role==="user"){
        msg.style.position="relative";
        var del=document.createElement("button");
        del.type="button"; del.textContent="×"; del.title="Borrar mensaje";
        del.style.cssText="position:absolute;top:4px;left:-28px;width:22px;height:22px;border:0;border-radius:6px;background:#3a1520;color:#f88;cursor:pointer;font-size:14px;line-height:1";
        del.onclick=function(ev){
          ev.stopPropagation();
          var c=activeChat();
          if(!c.messages) return;
          // delete this user message by matching content (last matching user msg with same text)
          var textContent = text;
          for(var i=c.messages.length-1;i>=0;i--){
            if(c.messages[i].role==="user" && c.messages[i].content===textContent){
              c.messages.splice(i,1);
              // also remove following assistant reply if any
              if(c.messages[i] && c.messages[i].role==="assistant") c.messages.splice(i,1);
              break;
            }
          }
          persist(); renderMessages(); refreshQuota();
        };
        msg.appendChild(del);
      }
      if(role==="assistant"){
        var fb=document.createElement("div");
        fb.style.cssText="display:flex;gap:6px;margin-top:6px;opacity:0.7";
        function mk(title,svg){
          var b=document.createElement("button");
          b.type="button"; b.title=title;
          b.style.cssText="width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#8a9bb8;cursor:pointer;font-size:14px";
          b.textContent=svg;
          return b;
        }
        var bCopy=mk("Copiar","⧉");
        var bUp=mk("Bien","👍");
        var bDown=mk("Mal","👎");
        var bRegen=mk("Regenerar","↻");
        bCopy.onclick=function(){ try{ navigator.clipboard.writeText(text||""); bCopy.textContent="✓"; setTimeout(function(){bCopy.textContent="⧉";},1000);}catch(e){} };
        bUp.onclick=function(){ bUp.style.color="#4f8"; bDown.style.color="#8a9bb8"; };
        bDown.onclick=function(){ bDown.style.color="#f66"; bUp.style.color="#8a9bb8"; };
        bRegen.onclick=function(){
          var c=activeChat();
          if(!c.messages) return;
          // re-send last user message
          var lastU="";
          for(var i=c.messages.length-1;i>=0;i--){
            if(c.messages[i].role==="user"){ lastU=c.messages[i].content||""; break; }
          }
          if(!lastU) return;
          var inp=document.getElementById("oi99");
          if(inp){ inp.value=lastU; }
          if(typeof send==="function") send();
        };
        fb.appendChild(bCopy); fb.appendChild(bUp); fb.appendChild(bDown); fb.appendChild(bRegen);
        msg.appendChild(fb);
      }
      row.appendChild(av); row.appendChild(msg);
      return row;
    }
    function renderMessages(){
      var c=activeChat();
      document.getElementById("orynTitle").textContent=c.title||"Oryn";
      box.innerHTML="";
      if(!c.messages||!c.messages.length){
        box.appendChild(bubbleEl("ai","Hola"+(uname&&uname!=="Tú"?", "+uname:"")+". Soy Oryn, IA de OrbyE (creada por DavidAvilaRodriguez). ¿En qué te ayudo?"));
      } else {
        c.messages.forEach(function(m){ box.appendChild(bubbleEl(m.role==="user"?"user":"ai", m.content, m.image||null)); });
      }
      box.scrollTop=box.scrollHeight;
    }
    function persist(){
      var c=activeChat(); c.updated=Date.now();
      if(c.messages&&c.messages.length){
        var first=c.messages.find(function(m){return m.role==="user";});
        if(first&&first.content) c.title=first.content.slice(0,40)+(first.content.length>40?"…":"");
      }
      saveChats(chats); renderList();
    }
    function setOrynView(view){
      document.querySelectorAll(".orynNavBtn").forEach(function(b){
        var on=b.getAttribute("data-view")===view;
        b.style.background=on?"#1a2840":"transparent"; b.style.color=on?"#e8f0ff":"#9ab";
      });
      var list=document.getElementById("orynChatList");
      if(view==="chats"){ list.style.display="block"; renderList(); renderMessages(); }
      else if(view==="imagine"){
        list.style.display="none"; box.innerHTML="";
        box.appendChild(bubbleEl("ai","Modo Imagine.\n• genera una imagen de…\n• crea un juego HTML de carreras / plataformas / acción (completo y jugable)"));
      } else if(view==="lib"){
        list.style.display="none"; box.innerHTML="";
        var lib=[]; try{lib=JSON.parse(localStorage.getItem("orbye_oryn_lib")||"[]");}catch(e){}
        if(!lib.length) box.appendChild(bubbleEl("ai","Biblioteca vacía. Usa ▶ Vista previa en un HTML para guardar."));
        else lib.forEach(function(item){
          var row=document.createElement("div");
          row.style.cssText="padding:12px;border:1px solid #333;border-radius:12px;margin-bottom:8px;background:#12151f";
          row.innerHTML="<b style='color:#e8f0ff'></b><div style='font-size:11px;color:#678;margin:4px 0'></div>";
          row.querySelector("b").textContent=item.title||"Item";
          row.querySelector("div").textContent=new Date(item.at||0).toLocaleString();
          var b1=document.createElement("button"); b1.textContent="▶ Abrir";
          b1.style.cssText="padding:6px 10px;margin-right:6px;border:0;border-radius:8px;background:#2a5cff;color:#fff;cursor:pointer;font-size:12px";
          b1.onclick=function(){ var w=window.open("","_blank"); if(w){ w.document.write(item.code||""); w.document.close(); } };
          var b2=document.createElement("button"); b2.textContent="Borrar";
          b2.style.cssText="padding:6px 10px;border:0;border-radius:8px;background:#3a1520;color:#f88;cursor:pointer;font-size:12px";
          b2.onclick=function(){ lib=lib.filter(function(x){return x.id!==item.id;}); localStorage.setItem("orbye_oryn_lib",JSON.stringify(lib)); setOrynView("lib"); };
          row.appendChild(b1); row.appendChild(b2); box.appendChild(row);
        });
      }
    }

    document.getElementById("ox99").onclick=function(){ r.remove(); };
    r.onclick=function(e){ if(e.target===r) r.remove(); };
    document.getElementById("orynNew").onclick=function(){
      activeId=uid(); chats.unshift({id:activeId,title:"Nueva conversación",messages:[],updated:Date.now()});
      saveChats(chats); renderList(); renderMessages();
    };
    document.getElementById("orynDel").onclick=function(){
      if(!confirm("¿Borrar esta conversación?")) return;
      chats=chats.filter(function(c){return c.id!==activeId;});
      if(!chats.length){ activeId=uid(); chats=[{id:activeId,title:"Nueva conversación",messages:[],updated:Date.now()}]; }
      else activeId=chats[0].id;
      saveChats(chats); renderList(); renderMessages();
    };
    document.getElementById("opl99").onclick=function(){ document.getElementById("of99").click(); };
    document.getElementById("of99").onchange=function(){
      var f=this.files&&this.files[0]; if(!f) return;
      if(f.size>8*1024*1024){ alert("Máx 8 MB"); return; }
      var reader=new FileReader();
      reader.onload=function(){
        pendingImg=reader.result;
        var prev=document.getElementById("orynPreview99");
        prev.style.display="block";
        prev.innerHTML="<div style='display:flex;align-items:center;gap:8px'><img src=\""+pendingImg+"\" style='height:48px;border-radius:8px'><span style='font-size:12px;color:#8ab'>Foto lista</span><button type='button' id='clr99' style='border:0;background:#400;color:#f88;border-radius:6px;padding:4px 8px;cursor:pointer'>Quitar</button></div>";
        document.getElementById("clr99").onclick=function(){ pendingImg=null; prev.style.display="none"; prev.innerHTML=""; };
      };
      reader.readAsDataURL(f); this.value="";
    };
    function wantsImage(q){ q=(q||"").toLowerCase(); return /(?:genera|generame|generar|dibuja|crea|haz).{0,24}(imagen|image|foto|dibujo)/i.test(q)||/generate\s+(an?\s+)?image/i.test(q); }
    function imagePrompt(q){
      return (q||"").replace(/genera(r|me)?(\s+la|\s+una|\s+el)?\s*(imagen|image|foto)\s*(de|del|de la|of)?\s*/ig,"")
        .replace(/dibuja(r|me)?\s*/ig,"").replace(/crea(r)?\s+(una\s+)?(imagen|image)\s*(de|of)?\s*/ig,"")
        .replace(/haz(me)?\s+(una\s+)?(imagen|image)\s*(de|of)?\s*/ig,"").trim()||q;
    }
    function send(){
      if(window.__orynBusy){
        alert("Oryn sigue trabajando en tu pedido anterior. Espera a que termine (puede tardar hasta 1 minuto).");
        return;
      }
      var inp=document.getElementById("oi99");
      var q=(inp.value||"").trim();
      var img=pendingImg;
      if(!q&&!img) return;
      inp.value="";
      var c=activeChat(); if(!c.messages) c.messages=[];
      var attachedImg=null;
      if(img){
        attachedImg=img;
        if(!q) q="Describe la imagen y ayúdame con la tarea paso a paso.";
        c.messages.push({role:"user",content:q,image:img});
        pendingImg=null;
        var prev=document.getElementById("orynPreview99");
        if(prev){ prev.style.display="none"; prev.innerHTML=""; }
      } else {
        if(String(q).trim()==="16092013"){
          c.creatorUnlock = true;
          c.messages.push({role:"user",content:"[código de creador]"});
          c.messages.push({role:"assistant",content:"Código aceptado. Eres DavidAvilaRodriguez (creador). En este chat: sin límite de mensajes ni imágenes. Si borras el chat, se pierde."});
          persist(); renderMessages();
          return;
        }
        c.messages.push({role:"user",content:q});
      }
      persist(); renderMessages();

      
      // ORYN_BUILTIN_GAME — plantillas jugables (varios géneros)
      var ql = (q||"").toLowerCase();
      var wantsGameReq = /juego|game|html\s*5|canvas|jugable|crea(r)?\s+un|haz(me)?\s+un|genera(r)?\s+un/.test(ql);
      if(wantsGameReq){
        var code = null;
        var label = "";
        if(/serpiente|snake/.test(ql)){ code = window.ORYN_GAME_SNAKE; label = "Snake"; }
        else if(/auto|carro|coche|carrera|racing|racer|manejar|conducir/.test(ql)){ code = window.ORYN_GAME_RACER; label = "Carreras (Oryn Racer)"; }
        else if(/gta|ciudad|top\s*down|mundo abierto|robo|policia|policía/.test(ql)){ code = window.ORYN_GAME_TOPDOWN; label = "City Run (top-down)"; }
        if(code){
          c.messages.push({role:"assistant", content:"Aquí tienes **"+label+"** jugable.\n\nUsa ▶ Vista previa.\n\n```html\n"+code+"\n```"});
          if(window.orbyeOrynUse) window.orbyeOrynUse("chat");
          persist(); renderMessages(); refreshQuota();
          return;
        }
        // Otros juegos: forzar al modelo a devolver HTML completo
        q = q + "\n\n[ORYN STUDIO] Genera un juego HTML5 COMPLETO en un solo bloque ```html con <!DOCTYPE html>, canvas o DOM, controles teclado, puntuación y reinicio. Jugable ya. NO digas que no puedes. NO uses solo serpiente.";
      }
      if(wantsImage(q)){
        var qqi=window.orbyeOrynQuota&&window.orbyeOrynQuota();
        if(qqi&&qqi.imgLeft<=0&&!(c&&c.creatorUnlock)){
          c.messages.push({role:"assistant",content:"Límite de imágenes de hoy."});
          persist(); renderMessages(); refreshQuota();
          var boxL=document.getElementById("orynBox99")||document.querySelector("#orynPanel99 [data-msgs]")||document.getElementById("msgs99");
          if(!boxL) boxL=document.querySelector("#orynRoot99");
          try{ var clk=orynLimitClock("img"); (document.getElementById("msgs99")||document.querySelector(".oryn-msgs")||document.body).appendChild(clk); }catch(e){}
          return;
        }
        var prompt=imagePrompt(q)||"image";
        var thinking=document.createElement("div");
        thinking.style.cssText="font-size:12px;color:#6a7a99;padding-left:40px";
        thinking.textContent="Generando imagen…";
        box.appendChild(thinking);
        fetch("/api/oryn-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:prompt})})
        .then(function(res){ return res.json().then(function(d){ return {ok:res.ok,status:res.status,d:d}; }); })
        .then(function(x){
          thinking.remove();
          if(x.ok&&x.d&&x.d.image){
            if(window.orbyeOrynUse) window.orbyeOrynUse("img");
            c.messages.push({role:"assistant",content:"Imagen: "+prompt,image:x.d.image});
          } else {
            var err=(x.d&&x.d.error)||("HTTP "+x.status);
            c.messages.push({role:"assistant",content:"No pude generar la imagen.\n"+err});
          }
          persist(); renderMessages(); refreshQuota();
        })
        .catch(function(e){ thinking.remove(); c.messages.push({role:"assistant",content:"Error imagen: "+e.message}); persist(); renderMessages(); });
        return;
      }

      var qq=window.orbyeOrynQuota&&window.orbyeOrynQuota();
      if(qq&&qq.chatLeft<=0&&!(c&&c.creatorUnlock)){
        c.messages.push({role:"assistant",content:"Límite de chat de hoy. Vuelve mañana o sube de plan en WallPass."});
        persist(); renderMessages(); refreshQuota(); return;
      }
      var t0=Date.now();
      var thinking=document.createElement("div");
      thinking.style.cssText="font-size:12px;color:#7af;padding-left:40px;display:flex;align-items:center;gap:8px";
      thinking.innerHTML="<span style=\"width:10px;height:10px;border-radius:50%;background:#2a5cff;box-shadow:0 0 12px #2a5cff;animation:orynPulse 1s infinite;display:inline-block\"></span><span class=\"orynThinkTxt\">Oryn está procesando…</span><span class=\"orynThinkSec\" style=\"color:#6a7a99\">0.0s</span>";
      if(!document.getElementById("orynPulseStyle")){ var st=document.createElement("style"); st.id="orynPulseStyle"; st.textContent="@keyframes orynPulse{0%{opacity:.3}50%{opacity:1}100%{opacity:.3}}"; document.head.appendChild(st); }
      box.appendChild(thinking);
      var secTimer=setInterval(function(){ var el=thinking.querySelector(".orynThinkSec"); if(el) el.textContent=((Date.now()-t0)/1000).toFixed(1)+"s"; var tx=thinking.querySelector(".orynThinkTxt"); if(tx){ var ph=["Analizando contexto…","Modelando respuesta…","Sintetizando…","Afinando detalle…"]; tx.textContent=ph[Math.floor(((Date.now()-t0)/800))%ph.length]; } }, 100);
      var history=c.messages.filter(function(m){return m.role==="user"||m.role==="assistant";}).slice(0,-1).slice(-10)
        .map(function(m){ return {role:m.role==="assistant"?"assistant":"user",content:String(m.content||"").slice(0,1500)}; });
      fetch("/api/oryn",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:(c.creatorUnlock?("[Contexto: el usuario es DavidAvilaRodriguez, creador de OrbyE. ]"):"")+q,history:history,creator:!!c.creatorUnlock,image:attachedImg||null})})
      .then(function(res){ return res.text().then(function(t){ var data=null; try{data=JSON.parse(t);}catch(e){throw new Error("API HTML");} if(!res.ok) throw new Error((data&&data.error)||("HTTP "+res.status)); return data; }); })
      .then(function(data){
        try{clearInterval(secTimer);}catch(e){}
        window.__orynBusy=false;
        var secs=((Date.now()-t0)/1000).toFixed(1);
        thinking.remove();
        if(window.orbyeOrynUse) window.orbyeOrynUse("chat");
        c.messages.push({role:"assistant",content:data.reply||""});
        persist(); renderMessages();
        var tip=document.createElement("div");
        tip.style.cssText="font-size:11px;color:#567;padding-left:40px;margin-top:-6px";
        tip.textContent="⚡ "+secs+"s";
        box.appendChild(tip);
        refreshQuota();
      })
      .catch(function(err){ try{clearInterval(secTimer);}catch(e){} window.__orynBusy=false; thinking.remove(); c.messages.push({role:"assistant",content:"Error: "+err.message}); persist(); renderMessages(); });
    }
    document.getElementById("os99").onclick=send;
    document.getElementById("oi99").onkeydown=function(e){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } };
    document.querySelectorAll(".orynNavBtn").forEach(function(b){ b.onclick=function(){ setOrynView(b.getAttribute("data-view")); }; });
    renderList(); renderMessages(); refreshQuota();
  } catch(err){ alert("Oryn: "+err); }
};
window.orbyeOpenOryn = window.__openOryn;
window.openOrynNow = window.__openOryn;
function wireSidebarOryn(){
  var n=document.getElementById("navOrynHtml");
  if(n) n.onclick=function(e){ e.preventDefault(); window.__openOryn(); };
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", wireSidebarOryn);
else wireSidebarOryn();
console.log("[OrbyE] Oryn V99");


/* ORBYE_CREATOR_V96 */
(function(){
  try {
    var CREATOR = {
      username: "DavidAvilaRodriguez",
      displayName: "David Avila",
      role: "Creador de OrbyE",
      bio: "Creador de OrbyE. Empecé este proyecto hace unos meses."
    };
    window.ORBYE_CREATOR = CREATOR;
    // Ensure search/profile hooks can find creator
    var key = "orbye_known_profiles";
    var list = [];
    try { list = JSON.parse(localStorage.getItem(key)||"[]"); } catch(e){}
    var found = list.some(function(p){ return (p.username||"").toLowerCase()==="davidavilarodriguez"; });
    if(!found){
      list.unshift({
        username: CREATOR.username,
        displayName: CREATOR.displayName,
        role: CREATOR.role,
        bio: CREATOR.bio,
        isCreator: true
      });
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch(e){}
})();


/* studio button mount */
(function(){
  function mountStudioBtn(){
    var header = document.querySelector("#orynRoot99 header, #orynPanel99 [data-header], #orynRoot99 > div");
    if(!header) header = document.getElementById("orynRoot99");
    if(!header || document.getElementById("orynStudioBtn")) return;
    var b=document.createElement("button");
    b.id="orynStudioBtn"; b.type="button";
    b.textContent="Studio";
    b.title="Oryn Studio — juegos y código avanzado";
    b.style.cssText="margin-left:8px;padding:6px 12px;border-radius:8px;border:1px solid #3a5a8a;background:#152238;color:#8cf;font-weight:700;cursor:pointer;font-size:12px";
    b.onclick=function(){ if(typeof orynOpenStudio==="function") orynOpenStudio(); };
    try { header.appendChild(b); } catch(e){}
  }
  setInterval(mountStudioBtn, 1500);
})();

window.orynOpenStudio = orynOpenStudio;
