
/* Open games.OrbyE — v1409 clean */
(function(){
  var LS = "orbye_games_hub_v1";
  function load(){ try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch(e){ return []; } }
  function save(list){ try { localStorage.setItem(LS, JSON.stringify(list)); } catch(e){} }

  var CATS = [
    {id:"all", label:"Todos"},
    {id:"action", label:"Acción"},
    {id:"puzzle", label:"Puzzle"},
    {id:"html", label:"HTML5"},
    {id:"unity", label:"Unity"},
    {id:"io", label:".io"}
  ];

  window.orbyePublishGame = function(game){
    if(!game || !game.name) return;
    var list = load();
    list.unshift({
      id: "g" + Date.now(),
      name: game.name,
      engine: game.html ? "html" : (game.url ? "link" : "html"),
      cat: game.cat || "html",
      url: game.url || "",
      html: game.html || "",
      desc: game.desc || "Desde Oryn",
      thumb: game.thumb || "",
      by: localStorage.getItem("orbye_demo_user") || "Oryn",
      at: Date.now()
    });
    save(list);
    return true;
  };

  window.orbyeOpenGamesHub = function(){
    console.log("[OrbyE] Opening Open games.OrbyE");
    var old = document.getElementById("ORBYE_GAMES_HUB");
    if(old) old.remove();

    var games = load();
    var cat = "all";

    var r = document.createElement("div");
    r.id = "ORBYE_GAMES_HUB";
    r.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#0b0e14;display:flex;flex-direction:column;font-family:system-ui,sans-serif;opacity:1";

    r.innerHTML =
      '<div style="padding:14px 18px;background:#12161f;border-bottom:1px solid #222;display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<b style="color:#fff;font-size:18px">Open games.OrbyE</b>' +
      '<input id="ogSearch" placeholder="Buscar..." style="flex:1;min-width:140px;padding:10px 14px;border-radius:20px;border:1px solid #345;background:#0a0d14;color:#fff">' +
      '<button type="button" id="ogUpload" style="padding:10px 16px;border:0;border-radius:12px;background:#e11;color:#fff;font-weight:800;cursor:pointer">+ Subir</button>' +
      '<button type="button" id="ogClose" style="padding:10px 14px;border:1px solid #444;border-radius:12px;background:transparent;color:#ccc;cursor:pointer">Cerrar</button>' +
      '</div>' +
      '<div id="ogCats" style="padding:12px 18px;display:flex;gap:8px;flex-wrap:wrap"></div>' +
      '<div id="ogGrid" style="flex:1;overflow:auto;padding:16px 18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px"></div>';

    document.body.appendChild(r);

    function thumb(g){
      if(g.thumb) return g.thumb;
      var bg = ["#1a3a6c","#4a1a5c","#1a5c3a","#5c2a1a"][(g.name||"x").length % 4];
      return "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect fill="'+bg+'" width="100%" height="100%"/>' +
        '<text x="50%" y="50%" text-anchor="middle" fill="#fff" font-size="22" font-family="sans-serif">' +
        String(g.name||"Game").slice(0,18) + '</text></svg>'
      );
    }

    function renderCats(){
      var c = document.getElementById("ogCats");
      c.innerHTML = "";
      CATS.forEach(function(x){
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = x.label;
        b.style.cssText = "padding:8px 14px;border:0;border-radius:12px;cursor:pointer;font-weight:600;font-size:13px;" +
          (cat===x.id ? "background:#2a5cff;color:#fff" : "background:#1a2233;color:#9ab");
        b.onclick = function(){ cat = x.id; renderCats(); renderGrid(); };
        c.appendChild(b);
      });
    }

    function playGame(g){
      if(g.url && /^https:\/\//i.test(g.url)){
        window.open(g.url, "_blank", "noopener");
        return;
      }
      if(g.html){
        var p = document.createElement("div");
        p.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#000;display:flex;flex-direction:column";
        p.innerHTML =
          '<div style="padding:10px 14px;background:#12161f;display:flex;gap:10px;align-items:center">' +
          '<b style="color:#fff;flex:1"></b>' +
          '<button type="button" id="ogPX" style="padding:8px 12px;border:0;border-radius:8px;background:#3a1520;color:#f88;cursor:pointer">Cerrar</button></div>' +
          '<div style="flex:1;position:relative" id="ogPBox"></div>';
        document.body.appendChild(p);
        p.querySelector("b").textContent = g.name || "Juego";
        var ifr = document.createElement("iframe");
        ifr.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock allow-forms");
        ifr.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;background:#000";
        document.getElementById("ogPBox").appendChild(ifr);
        ifr.srcdoc = g.html;
        document.getElementById("ogPX").onclick = function(){ p.remove(); };
        return;
      }
      alert("Este juego no tiene contenido.");
    }

    function renderGrid(){
      var q = (document.getElementById("ogSearch").value || "").toLowerCase();
      var grid = document.getElementById("ogGrid");
      grid.innerHTML = "";
      var list = games.filter(function(g){
        if(cat !== "all" && g.cat !== cat) return false;
        if(q && (g.name||"").toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if(!list.length){
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#678">No hay juegos. Sube uno o publícalo desde Oryn.</div>';
        return;
      }
      list.forEach(function(g){
        var card = document.createElement("div");
        card.style.cssText = "background:#141a26;border-radius:14px;overflow:hidden;cursor:pointer;border:1px solid #1e2838";
        card.innerHTML =
          '<div style="aspect-ratio:16/10;background:#0a0c12"><img style="width:100%;height:100%;object-fit:cover" alt=""></div>' +
          '<div style="padding:10px 12px"><div class="n" style="color:#eef3ff;font-weight:700;font-size:14px"></div>' +
          '<div class="d" style="font-size:11px;color:#678;margin-top:4px"></div></div>';
        card.querySelector("img").src = thumb(g);
        card.querySelector(".n").textContent = g.name || "Juego";
        card.querySelector(".d").textContent = g.desc || g.engine || "";
        card.onclick = function(){ playGame(g); };
        card.oncontextmenu = function(e){
          e.preventDefault();
          if(confirm("¿Eliminar \"" + (g.name||"") + "\"?")){
            games = games.filter(function(x){ return x.id !== g.id; });
            save(games);
            renderGrid();
          }
        };
        grid.appendChild(card);
      });
    }

    function openUpload(){
      var name = prompt("Nombre del juego:");
      if(!name) return;
      function wrapJsFile(js, title){
        return "<!DOCTYPE html><html><head><meta charset=UTF-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>"+
          String(title||"Game").replace(/</g,"")+"</title><style>html,body{margin:0;background:#0a0c12;color:#eee;font-family:system-ui;min-height:100%}</style></head><body><script>\n"+
          js+"\n</"+"script></body></html>";
      }
      var useFile = confirm("OK = subir archivo .html / .js\nCancelar = pegar enlace o HTML");
      if(useFile){
        var inp = document.createElement("input");
        inp.type = "file";
        inp.accept = ".html,.htm,.js,text/html,text/javascript";
        inp.onchange = function(){
          var f = inp.files && inp.files[0];
          if(!f) return;
          var reader = new FileReader();
          reader.onload = function(){
            var text = String(reader.result||"");
            var html = text;
            if(/\.js$/i.test(f.name) || (!/<html/i.test(text) && /function|const |let |var /.test(text))){
              html = wrapJsFile(text, name);
            }
            if(!html || html.length < 20){ alert("Archivo vacío o inválido"); return; }
            games.unshift({
              id: "g" + Date.now(),
              name: name,
              engine: "html",
              cat: "html",
              url: "",
              html: html,
              desc: "Subido: " + f.name,
              by: localStorage.getItem("orbye_demo_user") || "user",
              at: Date.now()
            });
            save(games);
            renderGrid();
            alert("Juego listo. Clic en la tarjeta para jugar.");
          };
          reader.readAsText(f);
        };
        inp.click();
        return;
      }
      var url = prompt("Enlace https:// (opcional):") || "";
      var html = "";
      if(!url){
        html = prompt("Pega el HTML del juego:") || "";
      }
      if(!url && !html){ alert("Necesitas enlace, HTML o archivo"); return; }
      if(url && !/^https:\/\//i.test(url)){ alert("El enlace debe ser https://"); return; }
      if(html && !/<html/i.test(html) && /function|const |let |var /.test(html)){
        html = wrapJsFile(html, name);
      }
      games.unshift({
        id: "g" + Date.now(),
        name: name,
        engine: html ? "html" : "link",
        cat: "html",
        url: url,
        html: html,
        desc: "",
        by: localStorage.getItem("orbye_demo_user") || "user",
        at: Date.now()
      });
      save(games);
      renderGrid();
    }

    document.getElementById("ogClose").onclick = function(){ r.remove(); };
    document.getElementById("ogUpload").onclick = openUpload;
    document.getElementById("ogSearch").oninput = renderGrid;
    renderCats();
    renderGrid();
  };

  // Bind button only — no global click capture
  function wire(){
    var btn = document.getElementById("navOpenGames");
    if(btn){
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        window.orbyeOpenGamesHub();
      };
    }
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
  setTimeout(wire, 400);
  setTimeout(wire, 1500);
  console.log("[OrbyE] Open games.OrbyE ready");
})();

/* FORCE_OPEN_151 */
(function(){
  function boot(){
    var btn = document.getElementById("navOpenGames");
    if(btn){
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        if(window.orbyeOpenGamesHub) window.orbyeOpenGamesHub();
        else alert("Falta games-hub.js en el deploy");
      };
    }
    // If old form title visible, replace on click of any "Open games"
    document.querySelectorAll("h3,h2,b,.gs-item,button,a").forEach(function(el){
      var t = (el.textContent||"").trim();
      if(t.indexOf("Open games.OrbyE")===0 || t==="Open games.OrbyE"){
        el.style.cursor = "pointer";
        el.onclick = function(e){
          e.preventDefault();
          if(window.orbyeOpenGamesHub) window.orbyeOpenGamesHub();
        };
      }
    });
  }
  setTimeout(boot, 200);
  setTimeout(boot, 1000);
  setTimeout(boot, 3000);
})();

/* OPEN_GAMES_FINAL_153 */
(function(){
  window.orbyeOpenGamesHub = window.orbyeOpenGamesHub || function(){
    alert("games-hub no cargó completo");
  };
  function go(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    try { window.orbyeOpenGamesHub(); } catch(err){ alert(err.message); }
  }
  window.orbyeOpenProjectsPanel = go;
  window.orbyeOpenProjects = go;
  function wire(){
    var b = document.getElementById("navOpenGames");
    if(b){ b.onclick = go; }
  }
  wire();
  setInterval(wire, 2000);
  console.log("[OrbyE] Open games FINAL 153");
})();
