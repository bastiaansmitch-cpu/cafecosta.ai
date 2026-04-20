export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages, sendLead } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "No valid messages array provided" });
    }

    // ─── Normale chat ───────────────────────────────────────
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

    // ─── Lead extractie + Zapier ────────────────────────────
    if (sendLead && process.env.ZAPIER_WEBHOOK) {
      try {
        // Laat AI de gegevens extraheren uit het gesprek
        const extractRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 200,
            temperature: 0,
            messages: [
              {
                role: "system",
                content: `Extraheer de volgende gegevens uit dit gesprek en geef alleen JSON terug, geen uitleg:
{
  "naam": "...",
  "contact": "...",
  "type_event": "...",
  "datum": "...",
  "personen": "..."
}
Als een waarde niet gevonden is, gebruik dan "onbekend".`
              },
              {
                role: "user",
                content: messages.filter(m => m.role !== "system").map(m =>
                  (m.role === "user" ? "Bezoeker" : "Costa") + ": " + m.content
                ).join("\n")
              }
            ]
          })
        });

        const extractData = await extractRes.json();
        const extractedText = extractData.choices?.[0]?.message?.content || "{}";
        let lead = {};
        try { lead = JSON.parse(extractedText); } catch (e) {}

        const conversatie = messages.filter(m => m.role !== "system").map(m =>
          (m.role === "user" ? "Bezoeker" : "Costa") + ": " + m.content
        ).join("\n");

        // Stuur naar Zapier
        await fetch(process.env.ZAPIER_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datum_aanvraag: new Date().toLocaleString("nl-NL"),
            naam:           lead.naam        || "onbekend",
            contact:        lead.contact     || "onbekend",
            type_event:     lead.type_event  || "onbekend",
            datum_event:    lead.datum       || "onbekend",
            personen:       lead.personen    || "onbekend",
            conversatie:    conversatie.slice(0, 2000)
          })
        });
      } catch (e) {
        console.error("Lead extractie fout:", e);
      }
    }

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error?.message });
  }
}
