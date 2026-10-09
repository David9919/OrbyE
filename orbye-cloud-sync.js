
/* orbye-cloud-sync.js — profiles / spaces / veltx meta → Supabase (como Samuray) */
(function(){
  function base(){ return (window.ORBYE_SUPABASE_URL||"").replace(/\/$/,""); }
  function key(){ return window.ORBYE_SUPABASE_ANON_KEY||window.__orbyeWorkingKey||""; }
  function headers(prefer){
    var k=key();
    var h={ apikey:k, Authorization:"Bearer "+k, Accept:"application/json", "Content-Type":"application/json" };
    if(prefer) h.Prefer = prefer;
    return h;
  }
  async function upsertProfile(username, data){
    if(!base()||!username) return false;
    try{
      var body=[{
        username: username,
        display_name: data.displayName||username,
        bio: data.bio||"",
        photo_url: (data.photo&&String(data.photo).indexOf("data:")===0)?null:data.photo||null,
        banner_url: (data.banner&&String(data.banner).indexOf("data:")===0)?null:data.banner||null,
        is_adult: !!data.adultOk,
        is_creator: !!(window.orbyeIsCreator&&window.orbyeIsCreator(username)),
        updated_at: new Date().toISOString()
      }];
      var res=await fetch(base()+"/rest/v1/orbye_profiles?on_conflict=username",{
        method:"POST", headers:headers("resolution=merge-duplicates,return=minimal"), body:JSON.stringify(body)
      });
      return res.ok||res.status===201;
    }catch(e){ return false; }
  }
  async function pullProfile(username){
    if(!base()||!username) return null;
    try{
      var res=await fetch(base()+"/rest/v1/orbye_profiles?username=eq."+encodeURIComponent(username)+"&select=*",{headers:headers()});
      if(!res.ok) return null;
      var rows=await res.json();
      return rows[0]||null;
    }catch(e){ return null; }
  }
  async function pullSpaces(){
    if(!base()) return [];
    try{
      var res=await fetch(base()+"/rest/v1/orbye_spaces?select=*&order=created_at.desc&limit=100",{headers:headers()});
      if(!res.ok) return [];
      return await res.json();
    }catch(e){ return []; }
  }
  async function pushSpace(sp){
    if(!base()||!sp) return false;
    try{
      var body=[{
        id: sp.id||sp.slug||("s"+Date.now()),
        name: sp.name||"Space",
        description: sp.description||sp.desc||"",
        owner: sp.owner||"",
        logo_url: sp.logo||sp.logo_url||null,
        banner_url: sp.banner||sp.banner_url||null,
        is_adult: !!(sp.isAdult||sp.adult||sp.is_adult),
        verified: !!(sp.verified||sp.official)
      }];
      var res=await fetch(base()+"/rest/v1/orbye_spaces?on_conflict=id",{
        method:"POST", headers:headers("resolution=merge-duplicates,return=minimal"), body:JSON.stringify(body)
      });
      return res.ok||res.status===201;
    }catch(e){ return false; }
  }
  async function pullVeltx(){
    if(!base()) return [];
    try{
      var res=await fetch(base()+"/rest/v1/orbye_veltx_videos?select=*&order=created_at.desc&limit=100",{headers:headers()});
      if(!res.ok) return [];
      return await res.json();
    }catch(e){ return []; }
  }
  window.orbyeCloudSync = { upsertProfile:upsertProfile, pullProfile:pullProfile, pullSpaces:pullSpaces, pushSpace:pushSpace, pullVeltx:pullVeltx };
  // merge spaces from cloud into local
  async function boot(){
    if(!base()||!key()) return;
    try{
      var remote = await pullSpaces();
      if(remote && remote.length){
        var local = {};
        try{ local = JSON.parse(localStorage.getItem("orbye_spaces_v2")||"{}"); }catch(e){}
        remote.forEach(function(r){
          if(!local[r.id]){
            local[r.id] = {
              id: r.id, name: r.name, description: r.description, owner: r.owner,
              logo: r.logo_url, banner: r.banner_url, isAdult: r.is_adult, verified: r.verified
            };
          }
        });
        localStorage.setItem("orbye_spaces_v2", JSON.stringify(local));
      }
    }catch(e){}
    // profile push current user if has data
    try{
      var u = localStorage.getItem("orbye_demo_user");
      if(!u) return;
      var all = JSON.parse(localStorage.getItem("orbye_user_profiles_v1")||"{}");
      if(all[u]) await upsertProfile(u, all[u]);
    }catch(e){}
  }
  setTimeout(boot, 2000);
  window.addEventListener("orbye-login-ok", function(){ setTimeout(boot, 500); });
})();
