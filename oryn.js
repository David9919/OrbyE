// Vercel Serverless: /api/oryn
// Env: GROQ_API_KEY=gsk_...

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(500).json({ error: "Missing GROQ_API_KEY", reply: "Falta GROQ_API_KEY en Vercel → Settings → Environment Variables." });
    return;
  }
  const message = (req.body && req.body.message) || "";
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Eres Oryn, la IA de OrbyE (red social de DavidAvila). Responde en el idioma del usuario, claro y útil. Puedes hablar de Onyx, Spaces, Veltx, OrbyPload, Wall Pass y Samuray del Norte." },
          { role: "user", content: String(message).slice(0, 4000) },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    const data = await r.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    res.status(200).json({ reply: reply || "Sin respuesta" });
  } catch (e) {
    res.status(500).json({ reply: "Error al contactar la IA." });
  }
}
