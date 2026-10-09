// Vercel Serverless — imágenes reales con Cloudflare Workers AI (gratis con límite)
// Env: CF_ACCOUNT_ID + CF_API_TOKEN (Workers AI)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const prompt = (body && body.prompt) ? String(body.prompt).slice(0, 800) : "";
  if (!prompt.trim()) return res.status(400).json({ error: "prompt vacío" });

  const accountId = (process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const token = (process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "").trim();

  if (!accountId || !token) {
    return res.status(500).json({
      error: "Falta Cloudflare para imágenes. En Vercel pon CF_ACCOUNT_ID y CF_API_TOKEN (gratis en dash.cloudflare.com → Workers AI).",
      setup: true
    });
  }

  const model = "@cf/black-forest-labs/flux-1-schnell";
  const url =
    "https://api.cloudflare.com/client/v4/accounts/" +
    accountId +
    "/ai/run/" +
    model;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        steps: 4
      })
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok || data.success === false) {
      const errMsg =
        (data.errors && data.errors[0] && data.errors[0].message) ||
        (data.error && data.error.message) ||
        data.error ||
        ("HTTP " + r.status);
      return res.status(r.status >= 400 ? r.status : 500).json({
        error: String(errMsg),
        hint: "Revisa CF_ACCOUNT_ID, CF_API_TOKEN (permiso Workers AI) y el límite diario de Neurons."
      });
    }

    // FLUX devuelve result.image en base64
    const b64 =
      (data.result && data.result.image) ||
      (data.result && data.result.images && data.result.images[0]) ||
      data.image;

    if (!b64 || typeof b64 !== "string") {
      return res.status(500).json({
        error: "Cloudflare no devolvió imagen",
        detail: JSON.stringify(data).slice(0, 300)
      });
    }

    const clean = b64.replace(/^data:image\/\w+;base64,/, "");
    return res.status(200).json({
      image: "data:image/jpeg;base64," + clean,
      model: model
    });
  } catch (e) {
    return res.status(500).json({
      error: String(e.message || e),
      hint: "Error de red al llamar Cloudflare Workers AI"
    });
  }
}
