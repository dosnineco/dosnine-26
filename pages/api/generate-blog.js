// pages/api/generate.ts
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end("Method not allowed");
    return;
  }

  // Optional: CORS header (only if calling from another domain)
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { prompt } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "No OpenAI API key" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8");

  // Keep-alive ping every 15s
  const keepAlive = setInterval(() => {
    res.write(`data: \uD83D\uDC93\n\n`);
  }, 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        stream: true,
        temperature: 0.1,
        max_tokens: 16384,
        stop: null,
        messages: [
          {
            role: "system",
            content: ` Your task is to write a deeply original, human-sounding, 3000+ word blog post in First-person voice: (“I”, “my”, “you”).Professional yet conversational tone.Avoid robotic tone, exaggerated claims, or repetitive language.Helpful Content Compliance (Google):Ensure originality,  stuffing or repeating brand names too often.Post should be something someone would bookmark, share, and trust.Formatting: Respond in Markdown only using proper structure:
 `,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      const error = await response.text();
      console.error("OpenAI Error:", error);
      res.write(`data: [ERROR] ${error}\n\n`);
      clearInterval(keepAlive);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    let done = false;
    let fullContent = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "");

          if (data === "[DONE]") {
            clearInterval(keepAlive);
            res.write(`data: ${JSON.stringify({ content: fullContent, type: "final" })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
          }


          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              // Optional: Send progressive updates (not parsed yet)
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            console.error("Could not parse line", line, e);
          }
        }
      }
    }
  } catch (err) {
    console.error("Unexpected server error:", err);
    res.write(`data: [ERROR] Unexpected error occurred\n\n`);
    res.end();
  } finally {
    clearInterval(keepAlive);
  }
}
