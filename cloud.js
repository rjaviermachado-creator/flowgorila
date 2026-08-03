
const Auth = {
  profileCache:null,
  profile(){return this.profileCache || Store.get("fg_profile",null)},

  async init(){
    document.querySelector("#account-btn").onclick=()=>this.open();
    document.querySelector("#edit-profile-btn").onclick=()=>this.open();
    document.querySelector("#signup-btn").onclick=()=>this.signup();
    document.querySelector("#signin-btn").onclick=()=>this.signin();
    document.querySelector("#signout-btn").onclick=()=>this.signout();
    await this.refresh();
  },

  status(text,type=""){
    const box=document.querySelector("#auth-status");
    box.textContent=text; box.className=`auth-status ${type}`;
  },

  open(){
    const p=this.profile()||{};
    document.querySelector("#account-name").value=p.display_name||p.name||"";
    document.querySelector("#account-email").value=Cloud.user?.email||p.email||"";
    document.querySelector("#account-bio").value=p.bio||"";
    document.querySelector("#account-password").value="";
    this.status(Cloud.enabled ? (Cloud.user?"Sesión iniciada. Puedes actualizar tu perfil.":"Crea una cuenta o inicia sesión.") : "Supabase no está configurado. La cuenta seguirá siendo local.");
    document.querySelector("#signout-btn").classList.toggle("hidden",!Cloud.user);
    document.querySelector("#account-modal").showModal();
  },

  values(){
    return {
      name:document.querySelector("#account-name").value.trim(),
      email:document.querySelector("#account-email").value.trim(),
      password:document.querySelector("#account-password").value,
      bio:document.querySelector("#account-bio").value.trim()
    };
  },

  async signup(){
    try{
      const values=this.values();
      if(!values.name||!values.email||values.password.length<6) throw new Error("Completa nombre, correo y una contraseña de 6 caracteres.");
      if(!Cloud.enabled){
        Store.set("fg_profile",{name:values.name,email:values.email,bio:values.bio,avatar:"🧑‍🚀"});
        this.status("Perfil local creado. Configura Supabase para cuentas reales.","success"); await this.refresh(); return;
      }
      await Cloud.signUp(values);
      this.status("Cuenta creada. Revisa tu correo si Supabase solicita confirmación.","success");
      await this.refresh();
    }catch(error){this.status(error.message,"error")}
  },

  async signin(){
    try{
      const values=this.values();
      if(!Cloud.enabled) throw new Error("Configura Supabase para iniciar sesión desde distintos dispositivos.");
      await Cloud.signIn(values);
      this.status("Sesión iniciada.","success");
      await this.refresh();
    }catch(error){this.status(error.message,"error")}
  },

  async signout(){
    try{await Cloud.signOut();this.profileCache=null;this.status("Sesión cerrada.","success");await this.refresh()}
    catch(error){this.status(error.message,"error")}
  },

  async refresh(){
    if(Cloud.enabled && Cloud.user){
      try{
        let profile=await Cloud.profile();
        if(!profile){
          const meta=Cloud.user.user_metadata||{};
          await Cloud.updateProfile({name:meta.display_name||Cloud.user.email.split("@")[0],bio:meta.bio||""});
          profile=await Cloud.profile();
        }
        this.profileCache=profile;
      }catch(error){console.error(error)}
    }else this.profileCache=Store.get("fg_profile",null);
    this.render();
  },

  render(){
    const p=this.profile();
    document.querySelector("#profile-avatar").textContent=p?.avatar_emoji||p?.avatar||"👤";
    document.querySelector("#profile-name").textContent=p?.display_name||p?.name||"Invitado";
    document.querySelector("#profile-bio").textContent=p?.bio||"Crea una cuenta para personalizar tu experiencia.";
    document.querySelector("#stat-players").textContent=p?1:0;
    document.querySelector("#account-btn").textContent=Cloud.user?"🟢":"👤";
  }
};
