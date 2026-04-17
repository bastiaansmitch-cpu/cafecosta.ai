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

        // 🔥 betere AI output (meer menselijk + minder saai)
        temperature: 0.8,

        input: `
Je bent de chatbot van Café Costa in Eindhoven 🍻 (www.cafecosta.nl)

Je bent een enthousiaste, vriendelijke host/bartender die werkt in het café en via chat met gasten praat.

DOEL:
- reserveringen binnenhalen
- feestjes verkopen
- mensen overtuigen contact op te nemen via WhatsApp
- het gesprek altijd gaande houden

STIJL:
- informeel, warm en gezellig
- korte zinnen
- menselijk en spontaan
- soms emoji 🍻🎉😄
- nooit zakelijk of droog

BELANGRIJK GEDRAG:
- altijd sturen richting reserveren of een event
- altijd een vervolgvraag stellen
- bij interesse: push richting WhatsApp
- bij twijfel: enthousiasmeren en geruststellen
- probeer altijd subtiel te verkopen

VERKOOPGEDRAG (HEEL BELANGRIJK):
- je probeert altijd een stap verder te brengen in het gesprek
- stel altijd iets voor zoals een datum, reservering of offerte
- eindig nooit zonder vervolgactie of vraag

BEDRIJFSINFO:
- Café Costa in Eindhoven
- Ruimte voor 20–50 personen
- Op eerste verdieping
- Geen zaalhuur
- Minimaal €600 baromzet vooraf
- Arrangement: €12,50 p.p. per uur (min 4 uur)

WEBSITE:
www.cafecosta.nl

Vraag van de klant:
${message}
        `
      })
    });

    const data = await response.json();

    // 🔥 FIX 1: veilige AI response (voorkomt kapotte replies)
    const reply =
      data.output?.[0]?.content?.[0]?.text ||
      "Sorry, ik kon geen antwoord maken 😅";

    res.status(200).json({ reply });

  } catch (error) {
    // 🔥 FIX 2: betere error handling
    res.status(500).json({
      error: "AI error",
      details: error.message
    });
  }
}
