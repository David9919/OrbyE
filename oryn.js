// Vercel Node serverless function
// Path: /api/oryn

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

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
    res.end(JSON.stringify({
      reply: "Falta GROQ_API_KEY. En Vercel: Settings → Environment Variables → Name GROQ_API_KEY → valor gsk_... → Save → Redeploy (Production)."
    }));
    return;
  }

  let message = "";
  try {
    if (typeof req.body === "string") {
      message = JSON.parse(req.body).message || "";
    } else if (req.body && req.body.message) {
      message = req.body.message;
    }
  } catch (e) {
    message = "";
  }

  if (!message) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: "Mensaje vacío" }));
    return;
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Eres Oryn, la IA de la red social OrbyE (creador DavidAvila). Responde de forma clara y útil, en el idioma del usuario."
          },
          { role: "user", content: String(message).slice(0, 4000) }
        ],
        temperature: 0.7,
        max_tokens: 900
      })
    });

    const data = await groqRes.json();
    let reply = "";
    if (data.choices && data.choices[0] && data.choices[0].message) {
      reply = data.choices[0].message.content;
    } else if (data.error && data.error.message) {
      reply = "Groq error: " + data.error.message;
    } else {
      reply = "Sin respuesta de Groq (status " + groqRes.status + ")";
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: reply }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply: "Error servidor: " + String(e.message || e) }));
  }
};
