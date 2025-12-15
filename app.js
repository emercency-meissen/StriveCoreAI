const chat = document.getElementById("chat");
const input = document.getElementById("input");

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

function add(text, type) {
  const d = document.createElement("div");
  d.className = "msg " + type;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

async function send() {
  const text = input.value.trim();
  if (!text) return;

  add(text, "user");
  input.value = "";

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
  add("Willkommen bei StriveCoreAI 👋", "ai");
}

newChat();
