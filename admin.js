const luxAdmin = document.getElementById("luxAdmin");
const adminIP = document.getElementById("adminIP");
const adminLogs = document.getElementById("adminLogs");
const adminWarnings = document.getElementById("adminWarnings");

luxAdmin.style.display = "none";

function showAdmin(data){
  luxAdmin.style.display = "block";
  adminIP.textContent = "Deine IP: " + data.ip;

  adminLogs.innerHTML = "";
  (data.logs || []).slice(-10).forEach(l=>{
    const d=document.createElement("div");
    d.className="adminLog";
    d.textContent=l;
    adminLogs.appendChild(d);
  });

  adminWarnings.innerHTML = "";
  (data.warnings || []).slice(-10).forEach(w=>{
    const d=document.createElement("div");
    d.className="adminLog";
    d.textContent=`⚠️ ${w.type} | ${w.ip}`;
    adminWarnings.appendChild(d);
  });
}

function adminCmd(type){
  send(type==="ONLINE"?"__ADMIN_ONLINE__":"__ADMIN_OFFLINE__");
}

function banIP(){
  send(`__ADMIN_BAN__:${banIP.value}:${banH.value}`);
}
