"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

// Defines the shape of a candidate object
type Candidate = {
  candidate_id: string
  name: string
  party_full: string
  incumbent_challenge_full: string
  district: string
  top_issues: string[]
}

type Divisions = {
  state: string
  district: string
}

// Accordion Card Component
function CandidateCard({ c }: { c: Candidate }) {
  // tracks whether this specific card is expanded or collapsed on this page
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  return (
    <div
      className="card"
      style={{ 
        cursor: "pointer", 
        border: "1px solid var(--border)", 
        borderRadius: "8px", 
        padding: "16px",
        background: "var(--card-bg)",
        transition: "all 0.2s ease"
      }}
      // This toggles the accordion "fold" on the same webpage
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* ALWAYS VISIBLE SUMMARY */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0 }}>{c.name}</h3>
          <p style={{ margin: "4px 0", color: "var(--text-muted)" }}>
             {c.party_full} — {c.incumbent_challenge_full}
          </p>
        </div>
        {/* Visual indicator for the accordion state */}
        <span style={{ fontSize: "1.2rem" }}>{isOpen ? "▲" : "▼"}</span>
      </div>

      {/* EXPANDABLE SECTION (The Accordion Fold) */}
      {isOpen && (
        <div 
          style={{ 
            marginTop: "16px", 
            borderTop: "1px solid var(--border)", 
            paddingTop: "16px", 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "24px" 
          }}
          // CRITICAL: Stop propagation so clicking inside doesn't close the accordion
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Column: Quick Facts */}
          <div>
            <p style={{ fontWeight: 600, marginBottom: "8px" }}>Campaign Details</p>
            <p>FEC ID: {c.candidate_id}</p>
            <p>Office: {c.district === "00" ? "U.S. Senate" : `U.S. House Dist. ${c.district}`}</p>
            
            {/* Optional button if they still want to see the separate deep-dive page */}
            <button 
              onClick={() => router.push(`/candidate?id=${c.candidate_id}`)}
              style={{ marginTop: "12px", padding: "8px 12px", cursor: "pointer" }}
            >
              View Full Profile →
            </button>
          </div>

          {/* Right Column: Dynamic Data Placeholders */}
          <div>
            <p style={{ fontWeight: 600, marginBottom: "8px" }}>Top Issues</p>
            {c.top_issues?.length > 0 ? (
                c.top_issues.map((issue, i) => <p key={i}>• {issue}</p>)
            ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Platform analysis coming soon via LLM.
                </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ElectionContent() {
  const searchParams = useSearchParams()
  const address = searchParams.get("address")
  const router = useRouter()

  const [divisions, setDivisions] = useState<Divisions | null>(null)
  const [houseCandidates, setHouseCandidates] = useState<Candidate[]>([])
  const [senateCandidates, setSenateCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError("")

        // 1. Google Civic API: Get District Info using Public Key
        const googleKey = process.env.NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY
        const divRes = await fetch(
          `https://www.googleapis.com/civicinfo/v2/divisionsByAddress?address=${encodeURIComponent(address ?? "")}&key=${googleKey}`
        )
        if (!divRes.ok) throw new Error("Address lookup failed. Please try a more specific address.")
        const divData = await divRes.json()

        // 2. Extract State and District
        const state = divData.normalizedInput.state
        let district = "00"
        for (const key of Object.keys(divData.divisions)) {
          const match = key.match(/\/cd:(\d+)/)
          if (match) {
            district = match[1].padStart(2, "0")
            break
          }
        }
        setDivisions({ state, district })

        // 3. FEC API: Fetch Candidates using Public Key
        const fecKey = process.env.NEXT_PUBLIC_FEC_API_KEY || "DEMO_KEY"
        const [hRes, sRes] = await Promise.all([
          fetch(`https://api.open.fec.gov/v1/candidates/?state=${state}&district=${district}&office=H&election_year=2024&api_key=${fecKey}`),
          fetch(`https://api.open.fec.gov/v1/candidates/?state=${state}&office=S&election_year=2024&api_key=${fecKey}`)
        ])

        const hData = await hRes.json()
        const sData = await sRes.json()

        // Map FEC results and ensure top_issues is an array to avoid join errors
        const mapResults = (list: any[]) => (list || []).map(c => ({ 
            ...c, 
            top_issues: [] // Will be populated by your teammate's LLM logic later
        }))
        
        

        setHouseCandidates(mapResults(hData.results))
        setSenateCandidates(mapResults(sData.results))
        setLoading(false)
      } catch (err) {
        console.error(err)
        setError("Failed to load ballot data. Please check your connection and API keys.")
        setLoading(false)
      }
    }

    if (address) fetchData()
  }, [address])

  if (loading) return <p style={{ textAlign: "center", marginTop: "48px" }}>Loading your ballot...</p>
  if (error) return <p style={{ textAlign: "center", marginTop: "48px", color: "red" }}>{error}</p>

  return (
    <div className="page" style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <button onClick={() => router.push("/")} style={{ marginBottom: "24px" }}>← Back</button>

      <h1>Your Ballot</h1>
      <p style={{ marginBottom: "32px", fontSize: "1.1rem" }}>
        {divisions?.state} — Congressional District {divisions?.district}
      </p>

      {/* SENATE SECTION */}
      <section style={{ marginBottom: "40px" }}>
        <h2>U.S. Senate</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {senateCandidates.map(c => <CandidateCard key={c.candidate_id} c={c} />)}
        </div>
      </section>

      {/* HOUSE SECTION */}
      <section>
        <h2>U.S. House — District {divisions?.district}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {houseCandidates.map(c => <CandidateCard key={c.candidate_id} c={c} />)}
        </div>
      </section>
    </div>
  )
}

export default function Election() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: "48px" }}>Loading...</p>}>
      <ElectionContent />
    </Suspense>
  )
}