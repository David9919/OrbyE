// Vercel Serverless — Oryn via Groq (texto + visión)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "Falta GROQ_API_KEY en Vercel → Settings → Environment Variables"
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const message = (body && body.message) ? String(body.message).slice(0, 8000) : "";
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const image = (body && body.image) ? String(body.image) : "";
  const creator = !!(body && body.creator);

  if (!message && !image) {
    return res.status(400).json({ error: "Mensaje vacío" });
  }

  const system =
    "Eres Oryn, IA oficial de OrbyE. Creador: DavidAvilaRodriguez. " +
    "Estilo claro y útil. Si hay imagen, DESCRÍBELA y ayuda con la tarea (matemáticas, texto, etc.). " +
    "Juegos HTML: bloque ```html completo y jugable. No inventes pagos ni claves. " +
    (creator ? "El usuario es el creador DavidAvilaRodriguez en este chat. " : "");

  // Vision if image provided (data URL or raw base64)
  let userContent;
  if (image && image.length > 50) {
    let url = image;
    if (!url.startsWith("data:")) {
      url = "data:image/jpeg;base64," + url;
    }
    userContent = [
      { type: "text", text: message || "Describe esta imagen y ayúdame con la tarea." },
      { type: "image_url", image_url: { url: url } }
    ];
  } else {
    userContent = message;
  }

  const messages = [
    { role: "system", content: system }
  ];
  history.forEach(function (m) {
    if (!m || !m.content) return;
    messages.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000)
    });
  });
  messages.push({ role: "user", content: userContent });

  const model = image
    ? (process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct")
    : (process.env.GROQ_MODEL || "llama-3.3-70b-versatile");

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.6,
        max_tokens: 4096
      })
    });
    const data = await r.json();
    if (!r.ok) {
      const err = (data && data.error && data.error.message) || ("HTTP " + r.status);
      // fallback text model if vision fails
      if (image) {
        const r2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + key,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: system },
              {
                role: "user",
                content:
                  (message || "Ayuda con esta tarea.") +
                  "\n[El usuario adjuntó una imagen pero el modelo de visión falló: " +
                  err +
                  ". Pide que describa la tarea o el texto de la foto.]"
              }
            ],
            temperature: 0.6,
            max_tokens: 2048
          })
        });
        const d2 = await r2.json();
        if (!r2.ok) {
          return res.status(r2.status).json({
            error: (d2 && d2.error && d2.error.message) || err
          });
        }
        const reply2 =
          d2.choices && d2.choices[0] && d2.choices[0].message
            ? d2.choices[0].message.content
            : "";
        return res.status(200).json({ reply: reply2 || "" });
      }
      return res.status(r.status).json({ error: err });
    }
    const reply =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "";
    return res.status(200).json({ reply: reply || "" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Error Oryn" });
  }
}
