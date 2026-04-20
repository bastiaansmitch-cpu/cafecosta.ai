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
        const gesprek = messages
          .filter(m => m.role !== "system")
          .map(m => (m.role === "user" ? "Bezoeker" : "Costa") + ": " + m.content)
          .join("\n");

        // Laat AI de gegevens netjes extraheren
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
                content: `Extraheer de volgende gegevens uit dit gesprek en geef ALLEEN een JSON object terug, geen uitleg of markdown.
Gebruik exacte korte waarden, bijvoorbeeld type_event is "verjaardag" niet "typeverjaardag".
{
  "naam": "voornaam van de bezoeker",
  "contact": "telefoonnummer of e-mailadres",
  "type_event": "verjaardag / bedrijfsborrel / feest / anders",
  "datum": "gewenste datum van het event",
  "personen": "aantal personen als getal"
}
Als een waarde niet gevonden is, gebruik dan "onbekend".`
              },
              {
                role: "user",
                content: gesprek
              }
            ]
          })
        });

        const extractData = await extractRes.json();
        const extractedText = extractData.choices?.[0]?.message?.content || "{}";

        let lead = {};
        try {
          const clean = extractedText.replace(/```json|```/g, "").trim();
          lead = JSON.parse(clean);
        } catch (e) {}

        // Stuur naar Zapier
        await fetch(process.env.ZAPIER_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datum_aanvraag: new Date().toLocaleString("nl-NL"),
            naam:           lead.naam       || "onbekend",
            contact:        lead.contact    || "onbekend",
            type_event:     lead.type_event || "onbekend",
            datum_event:    lead.datum      || "onbekend",
            personen:       lead.personen   || "onbekend",
            conversatie:    gesprek.slice(0, 2000)
          })
        });

      } catch (e) {
        console.error("Lead extractie fout:", e.message);
      }
    }

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error?.message });
  }
}
