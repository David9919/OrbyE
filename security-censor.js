
/* OrbyE censor + age verification helpers */
(function(){
  var BAD = [
    "puta","puto","mierda","cabron","cabrón","pendejo","pendejos","joder","coño","cojones",
    "fuck","shit","bitch","asshole","dick","pussy","nigger","nigga","faggot","slut","whore",
    "hijueputa","ptm","culero","verga","mamada","chingar","chinga","maricón","maricon"
  ];
  function censorText(text){
    if(!text) return text;
    var out = String(text);
    BAD.forEach(function(w){
      var re = new RegExp("\\b"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","gi");
      out = out.replace(re, function(m){
        if(m.length<=2) return "**";
        return m[0]+"*".repeat(Math.max(1,m.length-2))+m[m.length-1];
      });
    });
    return out;
  }
  window.orbyeCensorText = censorText;
  window.orbyeShouldCensorContext = function(ctx){
    // no censor in private DM
    if(ctx==="dm"||ctx==="private") return false;
    return true;
  };
  // Oryn as system moderator
  window.orbyeOrynMod = {
    name: "Oryn",
    role: "moderator",
    notice: function(msg){
      try{
        var list = JSON.parse(localStorage.getItem("orbye_mod_notices_v1")||"[]");
        list.unshift({ by:"Oryn", text:msg, at:Date.now(), system:true });
        localStorage.setItem("orbye_mod_notices_v1", JSON.stringify(list.slice(0,50)));
      }catch(e){}
    },
    reviewAgeClaim: function(user, birthIso){
      // Soft automated review — cannot prove real ID without external service
      var age = 0;
      try{
        var d=new Date(birthIso+"T00:00:00");
        var n=new Date();
        age=n.getFullYear()-d.getFullYear();
        var m=n.getMonth()-d.getMonth();
        if(m<0||(m===0&&n.getDate()<d.getDate())) age--;
      }catch(e){}
      var status = "pending";
      if(age>=18 && age<=100) status = "self_declared_adult";
      else if(age>=13 && age<18) status = "minor";
      else status = "invalid";
      try{
        var all=JSON.parse(localStorage.getItem("orbye_age_review_v1")||"{}");
        all[user]={ birth:birthIso, age:age, status:status, by:"Oryn", at:Date.now() };
        localStorage.setItem("orbye_age_review_v1", JSON.stringify(all));
        // ONLY verified after human mod — self declare is NOT full access to 18+
        if(status==="minor"){
          localStorage.setItem("orbye_is_adult","0");
          localStorage.setItem("orbye_age_verified","0");
        } else if(status==="self_declared_adult"){
          localStorage.setItem("orbye_is_adult","1");
          // require explicit verification for 18+ content
          if(localStorage.getItem("orbye_age_verified")!=="1"){
            localStorage.setItem("orbye_age_verified","0");
          }
        }
      }catch(e){}
      return status;
    }
  };
  window.orbyeCanViewAdult = function(){
    return localStorage.getItem("orbye_age_verified")==="1";
  };
  window.orbyeRequestAgeVerification = function(){
    var u = localStorage.getItem("orbye_demo_user");
    if(!u) return alert("Inicia sesión primero.");
    var note = prompt("Verificación de edad (Oryn + staff revisan):\nEscribe un mensaje para el equipo. En producción aquí iría documento oficial.\n\nPor ahora: confirma con tu nombre completo y que tienes 18+.");
    if(!note) return;
    try{
      var q=JSON.parse(localStorage.getItem("orbye_age_verify_queue_v1")||"[]");
      q.unshift({ user:u, note:note, at:Date.now(), status:"pending" });
      localStorage.setItem("orbye_age_verify_queue_v1", JSON.stringify(q.slice(0,100)));
      window.orbyeOrynMod.notice("Solicitud de verificación de edad de "+u+" en cola.");
      alert("Solicitud enviada. Oryn y el staff la revisarán. Hasta entonces el contenido 18+ sigue bloqueado.");
    }catch(e){ alert("Error al enviar solicitud."); }
  };
  // Admin can approve verification
  window.orbyeApproveAgeVerification = function(user){
    var role = localStorage.getItem("orbye_demo_role");
    var me = (localStorage.getItem("orbye_demo_user")||"").toLowerCase();
    if(role!=="admin" && me!=="davidavila") return false;
    try{
      var all=JSON.parse(localStorage.getItem("orbye_age_review_v1")||"{}");
      if(!all[user]) all[user]={};
      all[user].status="verified";
      all[user].verified_by=me;
      all[user].verified_at=Date.now();
      localStorage.setItem("orbye_age_review_v1", JSON.stringify(all));
      // if approving self
      if((localStorage.getItem("orbye_demo_user")||"")===user){
        localStorage.setItem("orbye_age_verified","1");
        localStorage.setItem("orbye_is_adult","1");
      }
      // store per-user verified list
      var v=JSON.parse(localStorage.getItem("orbye_age_verified_users_v1")||"{}");
      v[user]=1;
      localStorage.setItem("orbye_age_verified_users_v1", JSON.stringify(v));
      return true;
    }catch(e){ return false; }
  };
})();
