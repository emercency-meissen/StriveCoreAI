let chatId="chat-"+Date.now();
const chat=document.getElementById("chat");

function add(t,c){
  const d=document.createElement("div");
  d.className="msg "+c;
  d.textContent=t;
  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;
}

async function send(){
  const text=input.value;
  input.value="";
  add(text,"user");

  const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({chatId,message:text})});
  const d=await r.json();
  add(d.reply,"ai");
}
function newChat(){
  chat.innerHTML="";
  add("Willkommen bei StriveCore AI 👋","ai");
}
