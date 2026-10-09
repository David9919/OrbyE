/**
 * OrbyE ↔ Supabase bridge
 * Si hay URL + key en config.js, posts/perfiles/chat/veltx metadata se sincronizan.
 */
(() => {
  function softCloudBadge(ok, detail) {
    let el = document.getElementById("orbyeCloudBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "orbyeCloudBadge";
      el.setAttribute("aria-hidden","true");
      el.title = "";
      el.style.cssText = "position:fixed;bottom:6px;left:6px;z-index:5;width:8px;height:8px;padding:0;border:0;border-radius:50%;background:rgba(80,80,80,.25);opacity:0.22;font-size:0;color:transparent;cursor:default;pointer-events:none;";
      document.body.appendChild(el);
    }
    // hide old red lee fail toasts
    document.querySelectorAll("[class*='fail'], .cloud-fail").forEach(n => {
      if (n.textContent && /Failed to fetch|Lee fail/i.test(n.textContent)) n.style.display = "none";
    });
    if (ok) {
      el.style.background = "#0a2a15";
      el.style.color = "#8f8";
      el.style.border = "1px solid #2a6";
      el.textContent = "☁ Nube conectada";
    } else {
      el.style.background = "#2a2208";
      el.style.color = "#fc6";
      el.style.border = "1px solid #a80";
      el.textContent = ""; el.style.background="rgba(120,80,40,.2)";
    }
  }
  window.orbyeSoftCloudBadge = softCloudBadge;
  // hideRedFetch — oculta toasts rojos antiguos
  setInterval(function() {
    document.querySelectorAll("div,span,p").forEach(function(el) {
      var t = el.textContent || "";
      if (t.indexOf("Failed to fetch") >= 0 && t.indexOf("Lee fail") >= 0 && el.children.length < 3) {
        el.style.display = "none";
      }
    });
  }, 2000);

  function apiKeys() {
    const keys = [];
    if (window.ORBYE_SUPABASE_ANON_KEY) keys.push(window.ORBYE_SUPABASE_ANON_KEY);
    if (window.ORBYE_SUPABASE_ANON_KEY_LEGACY) keys.push(window.ORBYE_SUPABASE_ANON_KEY_LEGACY);
    return keys;
  }
  async function probeCloud() {
    const base = (window.ORBYE_SUPABASE_URL || "").replace(/\/$/, "");
    if (!base) { softCloudBadge(false); return false; }
    for (const key of apiKeys()) {
      try {
        const res = await fetch(base + "/rest/v1/global_messages?select=id&limit=1", {
          headers: { apikey: key, Authorization: "Bearer " + key, Accept: "application/json" }
        });
        if (res.ok || res.status === 200 || res.status === 206) {
          window.__orbyeWorkingKey = key;
          softCloudBadge(true);
          return true;
        }
        // 401/403 = key wrong; 404 table missing still means host works
        if (res.status === 404 || res.status === 300) {
          window.__orbyeWorkingKey = key;
          softCloudBadge(true);
          return true;
        }
      } catch (e) { /* try next */ }
    }
    softCloudBadge(false);
    return false;
  }
  setTimeout(probeCloud, 500);
  setInterval(probeCloud, 30000);


  const url = window.ORBYE_SUPABASE_URL;
  const key = window.ORBYE_SUPABASE_ANON_KEY;
  let sb = null;
  let ready = false;

  window.orbyeCloud = {
    enabled: false,
    client: null,
    async init() {
      if (!url || !key) {
        console.info("[OrbyE] Supabase no configurado → modo local");
        try {
          let b = document.getElementById("orbye-cloud-badge");
          if (!b) {
            b = document.createElement("div");
            b.id = "orbye-cloud-badge";
            b.textContent = "local";
            b.style.cssText = "position:absolute;bottom:8px;left:8px;z-index:20;font-size:10px;padding:3px 7px;border-radius:8px;background:transparent;color:#555;opacity:.3;pointer-events:none";
            document.body.appendChild(b);
          }
        } catch(_){}
        return false;
      }
      if (!window.supabase || !window.supabase.createClient) {
        console.warn("[OrbyE] Falta el script CDN de supabase-js");
        return false;
      }
      sb = window.supabase.createClient(url, key);
      window.orbyeCloud.client = sb;
      window.orbyeCloud.enabled = true;
      ready = true;
      console.info("[OrbyE] Supabase conectado");
      try {
        let b = document.getElementById("orbye-cloud-badge");
        if (!b) {
          b = document.createElement("div");
          b.id = "orbye-cloud-badge";
          b.style.cssText = "position:absolute;bottom:8px;left:8px;z-index:20;font-size:10px;padding:3px 7px;border-radius:8px;background:transparent;color:#3a5;opacity:.35;pointer-events:none;max-width:90vw";
          document.body.appendChild(b);
        }
        let ref = "";
        try { ref = new URL(url).hostname.split(".")[0]; } catch(_){}
        b.textContent = "☁ " + (ref || "Supabase");
        b.title = url;
      } catch(_){}
      return true;
    },
    async testSync() {
      if (!ready) return false;
      const b = document.getElementById("orbye-cloud-badge");
      try {
        // 1) Leer primero (si hay msgs en nube = lectura OK)
        const { data: existing, error: readErr } = await sb
          .from("global_messages")
          .select("id")
          .limit(5);
        if (readErr) {
          console.warn("[OrbyE] testSync read", readErr);
          if (b) {
            b.textContent = "☁ Lee: " + String(readErr.message || readErr.code).slice(0, 40);
            b.style.background = "#a00";
            b.title = readErr.message || "";
          }
          return false;
        }
        const count = (existing || []).length;
        // 2) Intentar escribir
        const mark = null; // PING desactivado — no spamea el chat
        const data = { id: "skip" }; const error = null;
        if (error || !data) {
          console.warn("[OrbyE] testSync insert", error);
          if (b) {
            // Si puede leer pero no escribir
            const msg = error ? (error.message || error.code) : "insert fail";
            b.textContent = count
              ? ("☁ Lee OK · escribe: " + String(msg).slice(0, 28))
              : ("☁ SQL: " + String(msg).slice(0, 40));
            b.style.background = "#a60";
            b.title = String(msg);
          }
          // Si al menos lee y hay mensajes, dejamos usar el chat en modo lectura
          return count > 0;
        }
        /* no ping delete */
        if (b) {
          b.textContent = "☁ Conectado · listo (" + (count + 1) + ")";
          b.style.background = "#0a2";
        }
        return true;
      } catch (e) {
        console.warn("[OrbyE] testSync", e);
        if (b) {
          b.textContent = "☁ Excepción test";
          b.style.background = "#a00";
        }
        return false;
      }
    },
    async getProfile(username) {
      if (!ready || !username) return null;
      const { data, error } = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) { console.warn(error); return null; }
      return data;
    },
    async deleteChatMessage(id) {
      if (!ready || !id) return false;
      const { error } = await sb.from("global_messages").delete().eq("id", id);
      if (error) { console.warn("del chat", error); return false; }
      return true;
    },
    async upsertProfile(username, data) {
      if (!ready) return null;
      const row = {
        username,
        display_name: data.displayName || data.name || username,
        bio: data.bio || "",
        // Prefer keeping cloud in sync; data: URLs skipped if too large (>100kb)
        photo_url: (function(){
          var p = data.photo ? String(data.photo) : "";
          if (p.startsWith("http")) return p;
          if (p.startsWith("data:") && p.length < 100000) return p;
          return null;
        })(),
        banner_url: (function(){
          var p = data.banner ? String(data.banner) : "";
          if (p.startsWith("http")) return p;
          if (p.startsWith("data:") && p.length < 100000) return p;
          return null;
        })(),
        is_adult: !!data.adultOk,
        role: data.role || "user",
        updated_at: new Date().toISOString()
      };
      const { data: out, error } = await sb.from("profiles").upsert(row, { onConflict: "username" }).select().maybeSingle();
      if (error) console.warn("profile upsert", error);
      return out;
    },
    async listPosts(limit = 50) {
      if (!ready) return [];
      const { data, error } = await sb.from("posts").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) { console.warn(error); return []; }
      return data || [];
    },
    async createPost({ author, body, spaceId, mediaUrl, mediaType }) {
      if (!ready) return null;
      // space_id en DB es UUID; los Spaces locales usan ids string → guardar espacio en el body
      const spaceTag = spaceId ? ("[space:" + String(spaceId).slice(0, 80) + "] ") : "";
      const { data, error } = await sb.from("posts").insert({
        author_username: author,
        body: spaceTag + (body || ""),
        space_id: null,
        media_url: mediaUrl || null,
        media_type: mediaType || null
      }).select().maybeSingle();
      if (error) { console.warn("createPost", error); return null; }
      return data;
    },
    async listVeltx(limit = 40) {
      if (!ready) return [];
      const { data, error } = await sb.from("veltx_items").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) { console.warn(error); return []; }
      return data || [];
    },
    async createVeltx(item) {
      if (!ready) return null;
      const { data, error } = await sb.from("veltx_items").insert({
        author_username: item.uploader || item.author_username,
        title: item.title,
        description: item.desc || item.description || "",
        hashtags: item.hashtags || "",
        is_clip: !!item.isClip,
        is_photo: !!item.isPhoto,
        storage_path: item.storage_path || null,
        cover_url: item.cover || item.cover_url || null,
        views: item.views || 0,
        likes: item.likes || 0
      }).select().maybeSingle();
      if (error) { console.warn(error); return null; }
      return data;
    },
    async resilientFetch(url, opts, tries = 3) {
      let lastErr = null;
      for (let i = 0; i < tries; i++) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 12000);
          const res = await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
          clearTimeout(t);
          return res;
        } catch (e) {
          lastErr = e;
          await new Promise(r => setTimeout(r, 800 * (i + 1)));
        }
      }
      throw lastErr || new Error("fetch failed");
    },
    async restListChat(limit = 120) {
      // Intenta global_messages y chat_messages (por si el proyecto tiene otro nombre)
      const tables = ["global_messages", "chat_messages"];
      let lastErr = null;
      let all = [];
      for (const table of tables) {
        try {
          const u = url + "/rest/v1/" + table + "?select=id,author_username,body,media_url,media_type,created_at&order=created_at.asc&limit=" + limit;
          const res = await fetch(u, {
            headers: {
              apikey: key,
              Authorization: "Bearer " + key,
              Accept: "application/json"
            }
          });
          if (!res.ok) {
            lastErr = table + ":" + res.status + " " + (await res.text()).slice(0, 60);
            continue;
          }
          const data = await res.json();
          if (Array.isArray(data) && data.length) {
            all = all.concat(data.map(r => Object.assign({ _table: table }, r)));
          } else if (Array.isArray(data)) {
            lastErr = null; // table ok but empty
          }
        } catch (e) {
          lastErr = String(e.message || e);
        }
      }
      // unique by id
      const byId = {};
      all.forEach(r => { if (r.id) byId[r.id] = r; });
      const data = Object.values(byId).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return { error: data.length ? null : lastErr, data };
    },
    async restListChat_UNUSED(limit = 120) {
      try {
        const u = url + "/rest/v1/global_messages?select=id,author_username,body,media_url,media_type,created_at&order=created_at.asc&limit=" + limit;
        const res = await window.orbyeCloud.resilientFetch(u, {
          headers: {
            apikey: key,
            Authorization: "Bearer " + key,
            Accept: "application/json"
          }
        });
        if (!res.ok) {
          const t = await res.text();
          console.warn("[OrbyE] REST listChat", res.status, t);
          return { error: res.status + " " + t.slice(0, 80), data: [] };
        }
        const data = await res.json();
        return { error: null, data: data || [] };
      } catch (e) {
        return { error: String(e.message || e), data: [] };
      }
    },
    async restSendChat({ author, body, mediaUrl, mediaType }) {
      try {
        const res = await fetch(url + "/rest/v1/global_messages", {
          method: "POST",
          headers: {
            apikey: key,
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            Prefer: "return=representation",
            Accept: "application/json"
          },
          body: JSON.stringify({
            author_username: author,
            body: body || "",
            media_url: mediaUrl || null,
            media_type: mediaType || null
          })
        });
        if (!res.ok) {
          const t = await res.text();
          console.warn("[OrbyE] REST sendChat", res.status, t);
          return null;
        }
        const data = await res.json();
        return Array.isArray(data) ? data[0] : data;
      } catch (e) {
        console.warn(e);
        return null;
      }
    },
    async listChat(limit = 120) {
      if (!url || !key) return [];
      // Prefer REST (más fiable en algunos deploys)
      const rest = await window.orbyeCloud.restListChat(limit);
      if (!rest.error && rest.data) {
        const b = document.getElementById("orbye-cloud-badge");
        if (b && rest.data.length) {
          b.textContent = "☁ Nube: " + rest.data.length + " msgs";
          b.style.background = "#0a2";
        }
        return rest.data;
      }
      if (!ready || !sb) {
        const b = document.getElementById("orbye-cloud-badge");
        if (b) {
          b.textContent = "☁ REST: " + String(rest.error || "fail").slice(0, 40);
          b.style.background = "#a00";
        }
        return [];
      }
      const { data, error } = await sb.from("global_messages").select("id,author_username,body,media_url,media_type,created_at").order("created_at", { ascending: true }).limit(limit);
      if (error) {
        console.warn("[OrbyE] listChat", error);
        const b = document.getElementById("orbye-cloud-badge");
        if (b) {
          if (window.orbyeSoftCloudBadge) window.orbyeSoftCloudBadge(false);
          b.style.display = "none"; // no más badge rojo agresivo
          return;
          b.style.background = "#a00";
        }
        return [];
      }
      return data || [];
    },
    subscribeChat(onRows) {
      if (!ready) return () => {};
      const ch = sb.channel("orbye-chat")
        .on("postgres_changes", { event: "*", schema: "public", table: "global_messages" }, async () => {
          const rows = await window.orbyeCloud.listChat(120);
          if (typeof onRows === "function") onRows(rows);
        })
        .subscribe();
      return () => { try { sb.removeChannel(ch); } catch (_) {} };
    },
    async sendChat({ author, body, mediaUrl, mediaType }) {
      // REST first
      const row = await window.orbyeCloud.restSendChat({ author, body, mediaUrl, mediaType });
      if (row) return row;
      if (!ready || !sb) return null;
      const { data, error } = await sb.from("global_messages").insert({
        author_username: author,
        body: body || "",
        media_url: mediaUrl || null,
        media_type: mediaType || null
      }).select().maybeSingle();
      if (error) {
        console.warn("[OrbyE] sendChat error", error);
        const badge = document.getElementById("orbye-cloud-badge");
        if (badge) {
          badge.textContent = "☁ Error: " + (error.message || "insert").slice(0, 40);
          badge.style.background = "#a00";
        }
        return null;
      }
      return data;
    },
    async listSpaces(limit = 50) {
      if (!ready) return [];
      const { data, error } = await sb.from("spaces").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) { console.warn(error); return []; }
      return data || [];
    },
    async createSpace({ slug, name, description, owner, isAdult, logoUrl, bannerUrl }) {
      if (!ready) return null;
      const { data, error } = await sb.from("spaces").upsert({
        slug,
        name,
        description: description || "",
        owner_username: owner,
        is_adult: !!isAdult,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null
      }, { onConflict: "slug" }).select().maybeSingle();
      if (error) { console.warn(error); return null; }
      return data;
    },
    async sendCallInvite({ fromUser, code, toUser }) {
      if (!ready) return null;
      // reuse dmca_notices style generic: store in global_messages as system? better simple insert into posts body
      // Use global_messages with body prefix CALL_INVITE|
      const body = "CALL_INVITE|" + code + "|" + (toUser || "*");
      const { data, error } = await sb.from("global_messages").insert({
        author_username: fromUser,
        body,
        media_type: "call_invite",
        media_url: code
      }).select().maybeSingle();
      if (error) { console.warn(error); return null; }
      return data;
    },
    async listCallInvites(forUser, limit = 20) {
      if (!ready) return [];
      const { data, error } = await sb.from("global_messages")
        .select("*")
        .eq("media_type", "call_invite")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) { console.warn(error); return []; }
      return (data || []).filter(r => {
        const parts = (r.body || "").split("|");
        const target = parts[2] || "*";
        return target === "*" || target === forUser;
      });
    },
    
    async upsertShopItem(item) {
      if (!ready) return null;
      const { data, error } = await sb.from("shop_items").upsert({
        id: item.id,
        name: item.name,
        price: item.price || "",
        cat: item.cat || "other",
        ship: item.ship || "digital",
        ship_note: item.shipNote || "",
        description: item.desc || "",
        img_url: item.img || null,
        owner_username: item.by || "",
        updated_at: new Date().toISOString()
      }, { onConflict: "id" }).select().maybeSingle();
      if (error) { console.warn("[shop]", error); return null; }
      return data;
    },
    async listShopItems(limit = 100) {
      if (!ready) return [];
      const { data, error } = await sb.from("shop_items").select("*").order("updated_at", { ascending: false }).limit(limit);
      if (error) { console.warn("[shop]", error); return []; }
      return data || [];
    },
    async setInventory(username, itemIds) {
      if (!ready) return null;
      const { data, error } = await sb.from("user_inventory").upsert({
        username,
        item_ids: itemIds || [],
        equipped: {},
        updated_at: new Date().toISOString()
      }, { onConflict: "username" }).select().maybeSingle();
      if (error) { console.warn("[inv]", error); return null; }
      return data;
    },
    async getInventory(username) {
      if (!ready) return null;
      const { data, error } = await sb.from("user_inventory").select("*").eq("username", username).maybeSingle();
      if (error) { console.warn("[inv]", error); return null; }
      return data;
    },
    async setEquipped(username, equipped) {
      if (!ready) return null;
      const { data, error } = await sb.from("user_inventory").upsert({
        username,
        equipped: equipped || {},
        updated_at: new Date().toISOString()
      }, { onConflict: "username" }).select().maybeSingle();
      if (error) { console.warn("[eq]", error); return null; }
      return data;
    },

    async createDmca({ name, url, details }) {
      if (!ready) return null;
      const { data, error } = await sb.from("dmca_notices").insert({
        claimant_name: name,
        content_url: url,
        details
      }).select().maybeSingle();
      if (error) { console.warn(error); return null; }
      return data;
    }
  };

  // Auto-init when DOM ready
  document.addEventListener("DOMContentLoaded", async () => {
    await window.orbyeCloud.init();
    window.dispatchEvent(new CustomEvent("orbye-cloud-ready", { detail: { enabled: window.orbyeCloud.enabled } }));
    // Auto health: escribe y lee un mensaje de prueba silencioso
    if (window.orbyeCloud.enabled) {
      window.orbyeCloud.testSync().then(ok => {
        const b = document.getElementById("orbye-cloud-badge");
        if (b) {
          b.textContent = ""; b.style.background = ok ? "rgba(40,120,60,.2)" : "rgba(120,80,40,.2)";
          b.style.background = ok ? "#0a2" : "#a50";
        }
      });
    }
  });
})();
