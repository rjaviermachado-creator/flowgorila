
const Auth = {
  profile(){return Store.get("fg_profile",null)},
  init(){
    document.querySelector("#account-btn").onclick=()=>this.open();
    document.querySelector("#edit-profile-btn").onclick=()=>this.open();
    document.querySelector("#account-form").addEventListener("submit",e=>{
      e.preventDefault();
      const profile={name:document.querySelector("#account-name").value.trim(),email:document.querySelector("#account-email").value.trim(),bio:document.querySelector("#account-bio").value.trim(),avatar:"🧑‍🚀"};
      Store.set("fg_profile",profile);document.querySelector("#account-modal").close();this.render();Store.pushNotification("Perfil actualizado");
    });
    this.render();
  },
  open(){
    const p=this.profile()||{};
    document.querySelector("#account-name").value=p.name||"";
    document.querySelector("#account-email").value=p.email||"";
    document.querySelector("#account-bio").value=p.bio||"";
    document.querySelector("#account-modal").showModal();
  },
  render(){
    const p=this.profile();
    document.querySelector("#profile-avatar").textContent=p?.avatar||"👤";
    document.querySelector("#profile-name").textContent=p?.name||"Invitado";
    document.querySelector("#profile-bio").textContent=p?.bio||"Crea un perfil local para personalizar tu experiencia.";
    document.querySelector("#stat-players").textContent=p?1:0;
  }
};
