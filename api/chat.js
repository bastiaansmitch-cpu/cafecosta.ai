export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Je bent de chatbot van Café Costa.

INFO:
- Café op eerste verdieping
- Ruimte voor 20-50 personen
- Geen zaalhuur, min. €600 baromzet vooraf
- Arrangement: €12,50 p.p. per uur (min 4 uur)

Doel:
- Bezoekers helpen
- Leads verzamelen
- Doorsturen naar WhatsApp

Vraag: ${message}`
      })
    });

    const data = await response.json();

    res.status(200).json({
      reply: data.output[0].content[0].text
    });

  } catch (error) {
    res.status(500).json({ error: "AI error", details: error.message });
  }
}
