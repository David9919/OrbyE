module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.statusCode = 200; res.end(); return; }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: "Usa POST" }));
    return;
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: "Falta GROQ_API_KEY" }));
    return;
  }
  let message = "";
  try {
    if (typeof req.body === "string") message = JSON.parse(req.body).message || "";
    else if (req.body && req.body.message) message = req.body.message;
  } catch (e) {}
  if (!message) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: "Mensaje vacío" }));
    return;
  }

  // MODELO CORRECTO (el 3.3 no existe en tu cuenta)
  const model = "llama-3.1-8b-instant";

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "Eres Oryn, la IA de OrbyE (creador DavidAvila). Responde claro y útil en el idioma del usuario." },
          { role: "user", content: String(message).slice(0, 4000) }
        ],
        temperature: 0.7,
        max_tokens: 900
      })
    });
    const data = await groqRes.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ reply: data.choices[0].message.content }));
      return;
    }
    const err = (data.error && data.error.message) || JSON.stringify(data).slice(0, 200);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: "Groq: " + err }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: "Error: " + String(e.message || e) }));
  }
};
