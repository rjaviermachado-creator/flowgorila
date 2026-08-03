
const Store = {
  get(key,fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}},
  set(key,value){localStorage.setItem(key,JSON.stringify(value))},
  pushNotification(text){
    const list=this.get("fg_notifications",[]);
    list.unshift({id:crypto.randomUUID?.()||Date.now(),text,date:new Date().toLocaleString("es-ES"),read:false});
    this.set("fg_notifications",list); App.renderNotifications();
  }
};
