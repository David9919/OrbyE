export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ reply: "POST only" }); return; }
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(500).json({ reply: "Falta GROQ_API_KEY en Vercel → Settings → Environment Variables. Luego Redeploy." });
    return;
  }
  let message = "";
  try { message = (req.body && req.body.message) || ""; } catch (e) {}
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Eres Oryn, IA de OrbyE creada para DavidAvila. Responde claro, en el idioma del usuario." },
          { role: "user", content: String(message).slice(0, 4000) }
        ],
        temperature: 0.7,
        max_tokens: 900
      })
    });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || data.error?.message || "Sin respuesta";
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Error al llamar a Groq: " + String(e.message || e) });
  }
}
