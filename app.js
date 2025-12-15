const chat = document.getElementById("chat");

function add(text, cls) {
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

async function send() {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  add(text, "user");

  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  });

  const d = await r.json();
  add(d.reply, "ai");
}

function newChat() {
  chat.innerHTML = "";
  add("Willkommen bei StriveCore AI 👋", "ai");
}

newChat();
