export default async function handler(req, res) {
  const { question } = req.body;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are The Birken Helper Bee 🐝, a warm and friendly AI training assistant. Only answer based on uploaded training documents and cite the file name where appropriate.' },
        { role: 'user', content: question }
      ]
    })
  });

  const data = await response.json();
  res.status(200).json({ reply: data.choices?.[0]?.message?.content });
}
