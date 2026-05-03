import { useState, useEffect } from "react";

export default function CandidateAnalysis() {
    const [subject, setSubject] = useState("");
    const [targetIssue, setTargetIssue] = useState(false);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function fetcCandidateData(e) {
        e.preventDefault();
        if (!subject || !targetIssue) return;

        setLoading(true);
        setError(null);
        setData(null);

        const promptText = `
        Extract the top 3 policy issues for ${subject}. 
        Then, determine their specific stance on the following target issue: ${targetIssue}. 

        You must respond ONLY with valid JSON matching the exact schema below. 
        Do not include markdown formatting like \`\`\`json, and do not add any explanation text.

    {
      "top_issues": [
        "issue 1", 
        "issue 2", 
        "issue 3"
      ],
      "target_issue_analyzed": "Repeat the target issue here",
      "stance": "Yes" 
    }
    `;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemma-4-31b-it-20260402:free",
          messages: [
            { role: "system", content: "You are a precise data extraction API. You output only raw, valid JSON." },
            { role: "user", content: promptText }
          ],
          temperature: 0.0 
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const jsonResponse = await response.json();
      const parsedData = JSON.parse(jsonResponse.choices[0].message.content);
      
      setData(parsedData);
    } catch (err) {
      setError("Failed to parse AI response. " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-container" style={{ maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Political AI Analyzer</h2>
      
      {/* 4. The Input Form */}
      <form onSubmit={fetchCandidateData} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <input 
          type="text" 
          placeholder="Candidate Name (e.g., Mayor Jane Doe)" 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <input 
          type="text" 
          placeholder="Target Issue (e.g., Healthcare, Zoning)" 
          value={targetIssue} 
          onChange={(e) => setTargetIssue(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <button 
          type="submit" 
          disabled={loading} 
          style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {/* 5. The Display Section (Only shows if there is an error or data) */}
      {error && <div style={{ color: 'red', marginTop: '15px' }}>{error}</div>}
      
      {data && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f4f4f4', borderRadius: '8px' }}>
          <h3>Results:</h3>
          <p><strong>Issue Checked:</strong> {data.target_issue_analyzed}</p>
          <p><strong>Stance:</strong> {data.stance}</p>
          
          <p><strong>Top 3 Priorities:</strong></p>
          <ul>
            {data.top_issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}