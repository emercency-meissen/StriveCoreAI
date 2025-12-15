function showAdmin(data){
  luxAdmin.style.display="block";
  luxIP.textContent="IP: "+data.ip;

  luxLogs.innerHTML=(data.logs||[])
    .slice(-10)
    .map(l=>"<div>"+l+"</div>")
    .join("");

  luxWarnings.innerHTML="";
  (data.warnings||[]).forEach((w,i)=>{
    const d=document.createElement("div");
    d.textContent=`[${w.type}] ${w.ip}`;
    d.onclick=()=>showWarningChat(w.chat);
    luxWarnings.appendChild(d);
  });
}

function showWarningChat(chat){
  luxChat.innerHTML=chat.map(m=>`${m.role}: ${m.content}`).join("\n");
}

function adminCmd(t){
  send(t==="ONLINE"?"__ADMIN_ONLINE__":"__ADMIN_OFFLINE__");
}

function luxBan(){
  send(`__ADMIN_BAN__:${luxBanIp.value}:${luxBanH.value}`);
}
