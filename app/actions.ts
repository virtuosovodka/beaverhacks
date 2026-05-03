"use server";

export async function getPoliticalMatches(promptText: string) {
  // 1. Grab the secure key from the .env file
  const API_KEY = process.env.OPENROUTER_API_KEY; 

  if (!API_KEY) {
    throw new Error('API key not configured on server');
  }

 // 2. Make the secure call directly to OpenRouter
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "HTTP-Referer": "http://localhost:3000", // OpenRouter requires this for free models
      "X-Title": "BeaverHacks Matchmaker",     // OpenRouter requires this for free models
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      // Swapped to a hyper-stable, widely supported free model
      model: "google/gemma-3-4b-it:free",
      messages: [
        { role: "system", content: "You are a precise data extraction API. Output raw, valid JSON only." },
        { role: "user", content: promptText }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter responded with status: ${response.status}`);
  }

  // 3. Return the JSON directly back to your component
  const data = await response.json();
  return data;
}