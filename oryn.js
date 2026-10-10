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
    res.end(JSON.stringify({ reply: "Falta GROQ_API_KEY en Vercel." }));
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

  // Modelos que sí existen en Groq (probar en orden)
  const models = [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "gemma2-9b-it",
    "mixtral-8x7b-32768"
  ];

  let lastErr = "";
  for (const model of models) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "Eres Oryn, la IA de OrbyE creada para DavidAvila. Responde claro y útil, en el idioma del usuario. Sé amigable y directa." },
            { role: "user", content: String(message).slice(0, 4000) }
          ],
          temperature: 0.7,
          max_tokens: 900
        })
      });
      const data = await groqRes.json();
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ reply: data.choices[0].message.content, model: model }));
        return;
      }
      lastErr = (data.error && data.error.message) || ("status " + groqRes.status);
    } catch (e) {
      lastErr = String(e.message || e);
    }
  }

  res.statusCode = 500;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ reply: "Groq no respondió. Último error: " + lastErr }));
};
