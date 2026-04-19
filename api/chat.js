export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "No valid messages array provided" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: "OpenAI failed", details: data });

    const reply = data.choices?.[0]?.message?.content?.trim() || "Ik help je zo snel mogelijk!";
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error?.message });
  }
}
