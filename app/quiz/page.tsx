'use client'
import { useState } from 'react';
import { getPoliticalMatches } from '../actions';

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_KEY;

interface Question {
  question: string;
  options: string[];
}

interface Answer {
  topic: string;
  stance: string;
}

interface Match {
  candidate_name: string;
  detailed_analysis: string;
}

interface Results {
  matches: Match[];
}

const VOTING_QUESTIONS: Question[] = [
  {
    question: "1. Healthcare is one of the most critical issues present today. What's your ideal solution?",
    options: [
      "Move towards a universal, single-payer system (Medicare for All).",
      "Enhance the current public-private mix and expand subsidies.",
      "Reduce government regulation and expand private insurance competition.",
      "Leave healthcare policy entirely to individual states."
    ]
  },
  {
    question: "2. How should the government handle the economy and job growth?",
    options: [
      "Heavy investment in public infrastructure and green energy jobs.",
      "Cut taxes and reduce regulations on businesses to spur hiring.",
      "Increase taxes on the wealthy to fund social safety nets.",
      "Focus on reducing the national debt by cutting federal spending."
    ]
  },
  {
    question: "3. What is your stance on environmental policy and climate change?",
    options: [
      "Aggressively transition to renewable energy, even if it costs fossil fuel jobs.",
      "Invest in green tech, but maintain current energy sources for stability.",
      "Rely on the free market to innovate solutions without government mandates.",
      "Focus solely on local conservation rather than global climate initiatives."
    ]
  },
  {
    question: "4. When it comes to K-12 education, where should the focus be?",
    options: [
      "Increase federal funding for public schools and increase teacher pay.",
      "Expand school choice, including vouchers for private/charter schools.",
      "Shift curriculum decisions entirely to local parents and school boards.",
      "Focus heavily on national standardized testing and STEM tracking."
    ]
  },
  {
    question: "5. How should we address the rising cost of housing?",
    options: [
      "Implement national rent control and build robust public housing.",
      "Provide tax incentives to developers who build affordable units.",
      "Deregulate zoning laws so builders can construct more homes freely.",
      "Provide direct government subsidies to first-time homebuyers."
    ]
  },
  {
    question: "6. What is your general approach to foreign policy?",
    options: [
      "Work closely with international coalitions and the UN on global issues.",
      "Prioritize our own country's economic and border security first.",
      "Intervene strictly for humanitarian crises, avoiding military conflicts.",
      "Maintain a strong global military presence to deter adversaries."
    ]
  },
  {
    question: "7. How should the justice system be reformed?",
    options: [
      "Focus strictly on rehabilitation, mental health, and ending cash bail.",
      "Maintain strict sentencing for violent crimes but reform drug offenses.",
      "Increase funding and resources for local police departments.",
      "Focus on community-led policing and demilitarizing law enforcement."
    ]
  },
  {
    question: "8. What role should the government play in technology and AI?",
    options: [
      "Heavily regulate AI to protect jobs and ensure ethical safeguards.",
      "Establish basic safety guidelines but let tech companies innovate freely.",
      "Take a completely hands-off approach to encourage rapid advancement.",
      "Focus primarily on breaking up large tech monopolies."
    ]
  },
  {
    question: "9. How should infrastructure be prioritized?",
    options: [
      "Massive funding for high-speed rail and public transit networks.",
      "Focus primarily on fixing existing roads, bridges, and highways.",
      "Encourage private companies to build and manage infrastructure.",
      "Focus solely on rural broadband and digital infrastructure."
    ]
  },
  {
    question: "10. What is your view on higher education (college/university)?",
    options: [
      "Make public universities tuition-free and forgive existing student debt.",
      "Expand grants for low-income students but keep tuition structures.",
      "Encourage vocational training and trade schools over 4-year degrees.",
      "Get the government out of student loans entirely to drive down costs."
    ]
  }
];

export default function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Answer[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = (selectedOption: string) => {
    const updatedAnswers: Answer[] = [...userAnswers, { 
      topic: VOTING_QUESTIONS[currentQuestion].question, 
      stance: selectedOption 
    }];
    
    setUserAnswers(updatedAnswers);

    if (currentQuestion + 1 < VOTING_QUESTIONS.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsFinished(true);
      generateResults(updatedAnswers);
    }
  };

  const generateResults = async (answersObj: Answer[]) => {
    setLoading(true);
    
    const formattedAnswers = answersObj.map(a => `${a.topic}\nAnswer: ${a.stance}`).join('\n\n');

    const promptText = `
    A user took a political matchmaker quiz. Here are their core priorities:
    
    ${formattedAnswers}

    Based on these specific priorities, suggest 3 real political candidates (or strong candidate archetypes) that are the best match for the user. 
    Do NOT include percentages. Provide a detailed paragraph for each candidate explaining exactly which of the user's choices matched this candidate's platform and why it makes them a good fit.

    You must respond ONLY with valid JSON matching this exact schema:
    {
      "matches": [
        {
          "candidate_name": "Name",
          "detailed_analysis": "Explanation referencing specific user answers..."
        }
      ]
    }
    `;

    try {
      // MAGIC: Just call the server action! No fetch, no URLs, no 405s.
      const jsonResponse = await getPoliticalMatches(promptText);
      
      const content = jsonResponse.choices[0].message.content;
      const clean = content.replace(/```json|```/g, '').trim();
      const parsedData: Results = JSON.parse(clean);
      
      setResults(parsedData);
    } catch (err) {
      setError("Failed to generate your political matches. " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setUserAnswers([]);
    setIsFinished(false);
    setResults(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>
      
      {!isFinished && (
        <div style={{ padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h4 style={{ color: '#666', marginBottom: '1rem' }}>Question {currentQuestion + 1} of {VOTING_QUESTIONS.length}</h4>
          <h2 style={{ marginBottom: '2rem' }}>{VOTING_QUESTIONS[currentQuestion].question}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {VOTING_QUESTIONS[currentQuestion].options.map((option, index) => (
              <button 
                key={index} 
                onClick={() => handleAnswer(option)}
                style={{ 
                    padding: '1.2rem', 
                    fontSize: '1rem', 
                    textAlign: 'left', 
                    backgroundColor: 'white', 
                    border: '2px solid #e0e0e0', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'black'
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#007BFF')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e0e0e0')}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {isFinished && loading && (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h2>Crunching the numbers...</h2>
          <p>Finding your political soulmates based on your answers!</p>
          <div style={{ marginTop: '2rem', fontSize: '2rem' }}>⚙️</div>
        </div>
      )}

      {isFinished && error && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <h2>Oops!</h2>
          <p>{error}</p>
          <button onClick={restartQuiz}>Try Again</button>
        </div>
      )}

      {isFinished && results && (
        <div>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Your Top 3 Matches</h1>
          
          <div style={{ display: 'grid', gap: '2rem' }}>
            {results.matches.map((match, index) => (
              <div key={index} style={{ padding: '2rem', backgroundColor: '#ffffff', border: '1px solid #ddd', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: '#007BFF', marginTop: 0 }}>#{index + 1}: {match.candidate_name}</h2>
                <p style={{ lineHeight: '1.6', fontSize: '1.1rem' }}>{match.detailed_analysis}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button 
              onClick={restartQuiz}
              style={{ padding: '1rem 2rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              Retake Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}