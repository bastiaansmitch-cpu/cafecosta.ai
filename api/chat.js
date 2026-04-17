export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "No valid message provided" });
    }

    const prompt = `
Je bent de chatbot van Café Costa 🍻

ROL:
Je bent een warme, vlotte host van Café Costa. Je helpt bezoekers met vragen en probeert op een natuurlijke manier reserveringen en aanvragen voor de ruimte te stimuleren.

STIJL:
- kort en duidelijk
- vriendelijk en menselijk
- informeel maar niet overdreven
- af en toe een subtiele emoji
- nooit droog of robotachtig

BELANGRIJK GEDRAG:
- geef concrete antwoorden
- stel vaak 1 logische vervolgvraag
- stuur bij interesse in groepen/feesten subtiel richting aanvraag
- zeg niet dat je een AI bent
- verzin geen informatie die je niet zeker weet

BEDRIJFSINFO:
- Café Costa
- ruimte op de eerste verdieping
- geschikt voor 20 tot 50 personen
- geen zaalhuur
- minimale barbesteding: €600 vooraf
- arrangement bier/fris/wijn: €12,50 per persoon per uur
- minimum arrangement: 4 uur

ALS IEMAND INTERESSE HEEFT IN DE RUIMTE:
- benoem kort de voordelen
- maak het laagdrempelig
- eindig bij voorkeur met een vervolgvraag zoals:
  "Voor hoeveel personen zoek je iets?"
  "Aan wat voor soort feestje denk je?"
  "Voor welke datum ongeveer?"

Vraag van bezoeker:
${message}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("OpenAI error:", data);
      return res.status(response.status).json({
        error: "OpenAI request failed",
        details: data
      });
    }

    const reply =
      data.output_text ||
      "Zeker 😊 Waar kan ik je mee helpen? Wil je iets weten over reserveren of over onze ruimte boven?";

    return res.status(200).json({ reply });
  } catch (error) {
    console.log("Server error:", error);
    return res.status(500).json({
      error: "AI error",
      details: error?.message || "Unknown server error"
    });
  }
}
