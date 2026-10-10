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
  const models = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama-3.2-3b-preview",
    "gemma2-9b-it",
    "mixtral-8x7b-32768"
  ];
  let lastErr = "Sin respuesta";
  for (const model of models) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "Eres Oryn, la IA de OrbyE Corporation (creador DavidAvila). Responde claro y útil en el idioma del usuario." },
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
      lastErr = (data.error && data.error.message) || lastErr;
    } catch (e) {
      lastErr = String(e.message || e);
    }
  }
  res.statusCode = 500;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ reply: "Groq: " + lastErr }));
};
