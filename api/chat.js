export default async function handler(req, res) {
  const { message } = req.body;

  const prompt = `
Je bent de chatbot van Café Costa.

Praat kort, gezellig en verkoopgericht.
Stuur richting reservering.

Info:
- 20-50 personen
- €600 dranktegoed
- €12,50 p.p per uur

Vraag: ${message}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();

  res.status(200).json({
    reply: data.choices[0].message.content
  });
}
