
import path from "path";
import fs from "fs";

export default async function handler(req, res) {
  const { question } = req.body;
  console.log("User question received:", question);

  // Load training chunks
  const chunksPath = path.join(process.cwd(), "api", "chunks.json");
  const data = JSON.parse(fs.readFileSync(chunksPath, "utf8"));
  console.log("Chunks loaded:", data.length);

  function cosineSimilarity(a, b) {
    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      input: question,
      model: 'text-embedding-3-small'
    })
  });
  const embedData = await embedResponse.json();
  console.log("Embedding response:", embedData);

  if (!embedData.data || !embedData.data[0]) {
    console.error("No embedding returned");
    return res.status(500).json({ reply: "Sorry, I couldn't process your question." });
  }

  const queryEmbedding = embedData.data[0].embedding;

  const scoredChunks = data.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));
  const topChunks = scoredChunks.sort((a, b) => b.score - a.score).slice(0, 3);
  console.log("Top matched chunks:", topChunks);

  const context = topChunks.map(c => `Source: ${c.source}\n\n${c.text}`).join("\n---\n");

  const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are The Birken Helper Bee 🐝, a friendly but accurate AI training assistant. Use only the context provided below to answer the question. If the answer isn't in the context, say you don't know.\n\nContext:\n${context}`
        },
        {
          role: 'user',
          content: question
        }
      ]
    })
  });

  const chatData = await chatResponse.json();
  console.log("Chat completion response:", chatData);

  const reply = chatData.choices?.[0]?.message?.content || 'Sorry, I had trouble finding that answer.';
  res.status(200).json({ reply });
}
