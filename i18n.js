(() => {
  const LANG_KEY = "orbye_lang";
  const labels = {
    es:"Español",en:"English",pt:"Português",fr:"Français",de:"Deutsch",it:"Italiano",
    zh:"中文",ja:"日本語",ko:"한국어",ar:"العربية",ru:"Русский",hi:"हिन्दी",
    tr:"Türkçe",nl:"Nederlands",pl:"Polski",sv:"Svenska",uk:"Українська",
    vi:"Tiếng Việt",th:"ไทย",id:"Indonesia"
  };
  const ALL = Object.keys(labels);

  const base = {
    home: "Home", news: "News", tube: "Veltx", spaces: "Spaces",
    wallpass: "WallPass", more: "More", login: "Log in", profile: "My profile",
    search: "Search OrbyE...", highlight: "Highlights",
    highlightSub: "Community trends: posts and recent content.",
    loginTitle: "Log in / Sign up", loginBtn: "Enter / Create account",
    staff: "Staff Team", chatGlobal: "Onyx Feed", chatMods: "Mods chat",
    proyectos: "Projects+", create: "Create", edit: "Edit", videos: "Videos",
    following: "Following", followers: "Followers", likes: "Likes",
    save: "Save profile", photo: "Profile photo", banner: "Banner",
    community: "Go to community", toVeltx: "Go to Veltx",
    groups: "Groups", call: "Call", blogs: "Guides / Blogs",
    guides: "Guides / Blogs", model3d: "3D OrbyPload",
    send: "Send", report: "Report", del: "Delete",
    trendingPosts: "Trending posts", veltxRecent: "Recent Veltx",
    noPosts: "No posts yet. Be the first.",
    welcomeNews: "Welcome to OrbyE Alpha/Beta"
  };

  const DICT = {
    es: {
      ...base,
      home: "Inicio", news: "Noticias", more: "Más", login: "Iniciar sesión", profile: "Mi perfil",
      search: "Buscar en OrbyE...", highlight: "Lo más destacado",
      highlightSub: "Tendencias de la comunidad: posts y contenido reciente.",
      loginTitle: "Iniciar sesión / Crear cuenta", loginBtn: "Entrar / Crear cuenta",
      staff: "Staff Team", chatGlobal: "Onyx Feed", chatMods: "Chat mods",
      proyectos: "Proyectos+", create: "Crear", edit: "Editar", videos: "Vídeos",
      following: "Siguiendo", followers: "Seguidores", likes: "Me gusta",
      save: "Guardar perfil", photo: "Foto de perfil", banner: "Banner",
      community: "Ir a la comunidad", toVeltx: "Ir a Veltx",
      groups: "Grupos", call: "Llamada", blogs: "Guías / Blogs",
      guides: "Guías / Blogs", model3d: "3D OrbyPload",
      send: "Enviar", report: "Reportar", del: "Eliminar",
      trendingPosts: "Posts en tendencia", veltxRecent: "Veltx reciente",
      noPosts: "Aún no hay posts. Sé el primero en la comunidad.",
      welcomeNews: "Bienvenidos a la fase Alfa/Beta de OrbyE"
    },
    en: { ...base },
    pt: {
      ...base,
      home: "Início", news: "Notícias", more: "Mais", login: "Entrar", profile: "Meu perfil",
      search: "Buscar no OrbyE...", highlight: "Destaques",
      highlightSub: "Tendências da comunidade.",
      loginTitle: "Entrar / Criar conta", loginBtn: "Entrar / Criar conta",
      chatGlobal: "Onyx Feed", chatMods: "Chat mods", proyectos: "Projetos+",
      create: "Criar", edit: "Editar", videos: "Vídeos",
      following: "Seguindo", followers: "Seguidores", likes: "Curtidas",
      save: "Salvar perfil", photo: "Foto de perfil", banner: "Banner",
      community: "Ir à comunidade", toVeltx: "Ir ao Veltx"
    },
    fr: {
      ...base,
      home: "Accueil", news: "Actualités", more: "Plus", login: "Connexion", profile: "Mon profil",
      search: "Rechercher sur OrbyE...", highlight: "À la une",
      highlightSub: "Tendances de la communauté.",
      loginTitle: "Connexion / Créer un compte", loginBtn: "Entrer",
      chatGlobal: "Onyx Feed", chatMods: "Chat modos", proyectos: "Projets+",
      create: "Créer", edit: "Modifier", videos: "Vidéos",
      following: "Abonnements", followers: "Abonnés", likes: "J'aime",
      save: "Enregistrer", photo: "Photo", banner: "Bannière",
      community: "Communauté", toVeltx: "Aller à Veltx"
    },
    de: {
      ...base,
      home: "Start", news: "News", more: "Mehr", login: "Anmelden", profile: "Mein Profil",
      search: "OrbyE durchsuchen...", highlight: "Highlights",
      highlightSub: "Community-Trends.",
      loginTitle: "Anmelden / Konto", loginBtn: "Einloggen",
      chatGlobal: "Onyx Feed", chatMods: "Mod-Chat", proyectos: "Projekte+",
      create: "Erstellen", edit: "Bearbeiten", videos: "Videos",
      following: "Folge ich", followers: "Follower", likes: "Likes",
      save: "Profil speichern", photo: "Profilfoto", banner: "Banner",
      community: "Community", toVeltx: "Zu Veltx"
    }
  };

  // fill missing langs with English
  ALL.forEach(function (c) {
    if (!DICT[c]) DICT[c] = Object.assign({}, base);
  });

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || "es"; } catch (e) { return "es"; }
  }

  function t(code) {
    return DICT[code] || DICT.en || base;
  }

  function setText(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el) el.textContent = text;
    });
  }

  function apply(code) {
    if (!code || !labels[code]) code = "es";
    try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
    var d = t(code);

    // Sidebar
    document.querySelectorAll('a[data-gs="inicio"], a.gs-item[href="#inicio"]').forEach(function (el) {
      el.textContent = "🏠 " + d.home;
    });
    document.querySelectorAll('a[data-gs="noticias"], a.gs-item[href="#noticias"]').forEach(function (el) {
      el.textContent = "📰 " + d.news;
    });
    document.querySelectorAll('a[data-gs="orbytube"], a.gs-item[href="#orbytube"]').forEach(function (el) {
      if (el.id === "veltxClipsNav" || el.getAttribute("data-no-i18n")) return;
      el.textContent = "▶ " + d.tube;
    });
    var clips = document.getElementById("veltxClipsNav");
    if (clips) clips.textContent = "✦ Veltx Clips";
    document.querySelectorAll('a[data-gs="comunidad"], a.gs-item[href="#comunidad"]').forEach(function (el) {
      el.textContent = "⬡ " + d.spaces;
    });
    var gChat = document.getElementById("globalChatOpen");
    if (gChat) gChat.textContent = "💬 " + d.chatGlobal;
    var mChat = document.getElementById("modChatOpen");
    if (mChat) mChat.textContent = "🛡 " + d.chatMods;
    var staff = document.getElementById("staffOpenBtn");
    if (staff) staff.textContent = "🛡 " + d.staff;
    var more = document.getElementById("gsMoreBtn");
    if (more) more.textContent = "＋ " + d.more;
    var proj = document.getElementById("openGamesHub");
    if (proj) proj.textContent = d.proyectos;
    var gbtn = document.getElementById("openGroupChatBtn");
    if (gbtn) gbtn.textContent = d.groups || "Groups";
    var cbtn = document.getElementById("openCallBtn");
    if (cbtn) cbtn.textContent = d.call || "Call";
    var bbtn = document.querySelector('a.gs-more-link[href="#guiasEmprende"]');
    if (bbtn) bbtn.textContent = d.blogs || d.guides || "Guides / Blogs";
    var m3 = document.getElementById("openModel3dBtn");
    if (m3) m3.textContent = d.model3d || "3D OrbyPload";
    // Home cards
    document.querySelectorAll("#inicio h3, #inicio .card h3").forEach(function(){});
    var trend = document.querySelector("#inicio .card h3, #inicio [data-i18n-trend]");

    // Top
    document.querySelectorAll('.top-mini-nav a[href="#inicio"]').forEach(function (el) { el.textContent = d.home; });
    document.querySelectorAll('.top-mini-nav a[href="#wallpass"]').forEach(function (el) { el.textContent = d.wallpass; });

    var search = document.getElementById("siteSearch");
    if (search) search.placeholder = d.search;

    var loginBtn = document.getElementById("loginButton");
    if (loginBtn && !localStorage.getItem("orbye_demo_user")) loginBtn.textContent = d.login;

    // IMPORTANT: only change text span, not whole button (keeps avatar)
    var profileText = document.querySelector("#profileButton .profile-btn-text");
    if (profileText) profileText.textContent = d.profile;
    else {
      var profileBtn = document.getElementById("profileButton");
      // don't wipe avatar children
      if (profileBtn && !profileBtn.querySelector("img") && !profileBtn.querySelector("#profileBtnAvatar")) {
        profileBtn.textContent = d.profile;
      }
    }

    var h2 = document.querySelector("#inicio h2");
    if (h2) h2.textContent = d.highlight;
    var sub = document.querySelector("#inicio .section-head .muted, #inicio > .muted, #inicio p.muted");
    if (sub) sub.textContent = d.highlightSub;

    var loginTitle = document.querySelector("#accountPanel h3");
    if (loginTitle) loginTitle.textContent = d.loginTitle;
    var accountSubmit = document.getElementById("accountSubmit");
    if (accountSubmit) accountSubmit.textContent = d.loginBtn;

    var ttV = document.getElementById("ttTabVideos");
    if (ttV) ttV.textContent = d.videos;
    var ttE = document.getElementById("ttTabEdit");
    if (ttE) ttE.textContent = d.edit;
    var saveP = document.getElementById("saveProfileBtn");
    if (saveP) saveP.textContent = d.save;

    var chip = document.getElementById("langMiniBtn");
    if (chip) chip.textContent = "🌐 " + (labels[code] || code);

    var sel = document.getElementById("accountLang");
    if (sel) sel.value = code;

    document.documentElement.lang = code;
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";

    // Chat labels
    var chatMap = {
      es: { eyebrow: "ONYX FEED", title: "OrbyE · Onyx Feed", sub: "Feed visual de la comunidad.", send: "Enviar", placeholder: "Escribe en Onyx Feed..." },
      en: { eyebrow: "GLOBAL CHAT", title: "OrbyE · Global chat", sub: "Community-wide OrbyE chat.", send: "Send", placeholder: "Global message..." },
      pt: { eyebrow: "ONYX FEED", title: "OrbyE · Onyx Feed", sub: "Chat de toda a comunidade OrbyE.", send: "Enviar", placeholder: "Escribe en Onyx Feed..." },
      fr: { eyebrow: "ONYX FEED", title: "OrbyE · Onyx Feed", sub: "Chat de toute la communauté.", send: "Envoyer", placeholder: "Write in Onyx Feed..." },
      de: { eyebrow: "GLOBALER CHAT", title: "OrbyE · Globaler Chat", sub: "Community-Chat von OrbyE.", send: "Senden", placeholder: "Globale Nachricht..." }
    };
    var cm = chatMap[code] || chatMap.en;
    document.querySelectorAll("[data-i18n-chat]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-chat");
      if (cm[k]) el.textContent = cm[k];
    });
    var gSend = document.getElementById("globalChatSend");
    if (gSend) gSend.textContent = cm.send;
    var gIn = document.getElementById("globalChatInput");
    if (gIn) gIn.placeholder = cm.placeholder;

    window.dispatchEvent(new CustomEvent("orbye-lang", { detail: { lang: code } }));
  }

  function init() {
    var menu = document.getElementById("langMiniMenu");
    if (menu) {
      menu.innerHTML = ALL.map(function (c) {
        return '<button type="button" data-lang="' + c + '">' + labels[c] + "</button>";
      }).join("");
      menu.addEventListener("click", function (e) {
        var b = e.target.closest("[data-lang]");
        if (!b) return;
        apply(b.getAttribute("data-lang"));
        menu.hidden = true;
      });
    }
    var btn = document.getElementById("langMiniBtn");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (menu) menu.hidden = !menu.hidden;
      });
    }
    document.addEventListener("click", function (e) {
      if (menu && !menu.hidden && !e.target.closest("#langMiniMenu") && !e.target.closest("#langMiniBtn")) {
        menu.hidden = true;
      }
    });
    var sel = document.getElementById("accountLang");
    if (sel) {
      sel.addEventListener("change", function () { apply(sel.value); });
    }
    apply(getLang());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.orbyeSetLang = apply;
  window.orbyeGetLang = getLang;
})();
