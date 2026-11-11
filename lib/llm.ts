import { z } from "zod";

export async function askJSON<S extends z.ZodTypeAny>(system: string, user: string, schema: S): Promise<z.infer<S>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system + " Reply with JSON only." },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error("AI error: " + (await res.text()));
    const data = await res.json();
    try {
      return schema.parse(JSON.parse(data.choices[0].message.content));
    } catch { /* wrong shape: try once more */ }
  }
  throw new Error("The AI answered in the wrong format twice. Please try again.");
}