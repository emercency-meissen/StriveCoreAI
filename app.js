const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const overlay = document.getElementById("overlay");
const err = document.getElementById("err");

function add(t,c){
  const d=document.createElement("div");
  d.className="msg "+c;
  d.textContent=t;
  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;
}

/* CHECK LOGIN */
async function check(){
  const r = await fetch("/api/me");
  const d = await r.json();
  if(d.logged){
    overlay.style.display="none";
    input.disabled=false;
    sendBtn.disabled=false;
    input.placeholder="Nachricht schreiben…";
  }
}
check();

/* SEND */
async function send(){
  const text=input.value.trim();
  if(!text) return;
  input.value="";
  add(text,"user");

  const r = await fetch("/chat",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ message:text })
  });

  if(r.status===401){
    overlay.style.display="flex";
    return;
  }

  const d=await r.json();
  add(d.reply,"ai");
}

/* ENTER SEND */
input.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&!e.shiftKey){
    e.preventDefault(); send();
  }
});

/* AUTH */
async function login(){
  const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({username:user.value,password:pass.value})});
  const d=await r.json();
  if(d.ok) check();
  else err.textContent="Login fehlgeschlagen";
}

async function register(){
  await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({username:user.value,password:pass.value})});
  err.textContent="Registriert – jetzt einloggen";
}
