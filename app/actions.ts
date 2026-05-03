"use server";

export async function getPoliticalMatches(promptText: string) {
  const API_KEY = process.env.OPENROUTER_API_KEY; 

  if (!API_KEY) {
    throw new Error('API key not configured on server');
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "HTTP-Referer": "http://localhost:3000", 
      "X-Title": "BeaverHacks Matchmaker",     
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "google/gemma-4-31b-it:free",
      messages: [
        { 
          role: "user", 
          content: "You are a precise data extraction engine. Output ONLY valid, raw JSON matching the requested schema. No conversational text, no markdown backticks.\n\n" + promptText 
        }
      ],
      temperature: 0.1
      // NOTICE: response_format is completely gone! 
    })
  });

  if (!response.ok) {
    // This will help us see exactly what OpenRouter is complaining about in the logs
    const errorData = await response.text();
    console.error("OpenRouter Error Details:", errorData);
    throw new Error(`OpenRouter responded with status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}