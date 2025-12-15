async function login() {
  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.value, password: pass.value })
  });
  const d = await r.json();
  if (d.ok) {
    loginBox.hidden = true;
    app.hidden = false;
  }
}

async function register() {
  await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.value, password: pass.value })
  });
  alert("Registriert");
}
