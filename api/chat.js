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

    if (sendLead && process.env.ZAPIER_WEBHOOK) {
      try {
        const gesprek = messages
          .filter(m => m.role !== "system")
          .map(m => (m.role === "user" ? "Bezoeker" : "Costa") + ": " + m.content)
          .join("\n");

        const extractRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 300,
            temperature: 0,
            messages: [
              {
                role: "system",
                content: `Analyseer dit gesprek tussen een bezoeker en een chatbot van Café Costa. Extraheer de onderstaande gegevens en retourneer ALLEEN een JSON object, geen uitleg, geen markdown.

Velden:
- naam: de voornaam van de bezoeker (staat vaak in een zin zoals "ik ben Jan" of "Jan 0612345678" of gewoon "Jan")
- contact: het telefoonnummer of e-mailadres van de bezoeker
- type_event: het type feest/event, kies exact één van: verjaardag, bedrijfsborrel, feest, anders
- datum: de gewenste datum van het event (bijv "8 mei" of "8 juni")
- personen: het aantal personen als getal

Zoek goed in de bezoeker-berichten. Telefoonnummers zijn reeksen van 6 of meer cijfers. Namen staan vaak vlak voor of na een telefoonnummer.

Voorbeeld output: {"naam":"Jan","contact":"0641806311","type_event":"verjaardag","datum":"8 mei","personen":"30"}

Gebruik "onbekend" als je een waarde niet kunt vinden.`
              },
              { role: "user", content: gesprek }
            ]
          })
        });

        const extractData = await extractRes.json();
        const rawText = extractData.choices?.[0]?.message?.content || "{}";

        let lead = {};
        try {
          lead = JSON.parse(rawText.replace(/```json|```/g, "").trim());
        } catch(e) {}

        await fetch(process.env.ZAPIER_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datum_aanvraag: new Date().toLocaleString("nl-NL"),
            naam:        lead.naam        || "onbekend",
            contact:     lead.contact     || "onbekend",
            type_event:  lead.type_event  || "onbekend",
            datum_event: lead.datum       || "onbekend",
            personen:    lead.personen    || "onbekend",
            conversatie: gesprek.slice(0, 2000)
          })
        });

      } catch(e) {
        console.error("Lead fout:", e.message);
      }
    }

    return res.status(200).json({ reply });

  } catch(error) {
    return res.status(500).json({ error: "Server error", details: error?.message });
  }
}
