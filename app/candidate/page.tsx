"use client"
//need next cliuent to have interactive ui components in browser 

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

type CandidateDetail = {
    candidate_id: string
    name: string 
    party_full: string 
    state: string 
    district: string 
    office_full: string 
    incumbent_challenge_full: string 
}

function CandidateContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get("id")
    const router = useRouter()

    const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        async function fetchCandidate(){
            try {
                const res = await fetch(
                              `https://api.open.fec.gov/v1/candidate/${id}/?api_key=${process.env.NEXT_PUBLIC_FEC_API_KEY}`

                )
                const data = await res.json()
                setCandidate(data.results[0])
                setLoading(false)

            } catch (err) {
                console.log(err)
                setError("Failed to load candidate data")
                setLoading(false)
            }
        }

        if (id) fetchCandidate()

    }, [id])

    if (loading) return <p style={{ textAlign: "center", marginTop: "48px" }}>Loading candidate...</p>
    if (error) return <p style={{ textAlign: "center", marginTop: "48px", color: "var(--accent)" }}>{error}</p>

    return (
        <div className="page">
        <button onClick={() => router.back()} style={{ marginBottom: "24px" }}>
            ← Back
        </button>

        {/* TOP ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "32px" }}>
            
            {/* LEFT -- identity */}
            <div className="card" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {/* placeholder image */}
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--border)", flexShrink: 0 }} />
            <div>
                <h2 style={{ borderBottom: "none", marginBottom: "4px" }}>{candidate?.name}</h2>
                <p>Age: --</p>
                <p>{candidate?.state}{candidate?.district !== "00" ? `, District ${candidate?.district}` : ""}</p>
                <p>{candidate?.party_full}</p>
                <p>{candidate?.incumbent_challenge_full}</p>
            </div>
            </div>

            {/* MIDDLE -- funding */}
            <div className="card">
            <h3 style={{ marginBottom: "12px" }}>Campaign Funding</h3>
            <p>Raised: --</p>
            <p>Spent: --</p>
            <div style={{ marginTop: "16px" }}>
                <p style={{ marginBottom: "8px", fontWeight: 600 }}>Funding Sources</p>
                <p>Individual donations: --%</p>
                <p>PAC money: --%</p>
                <p>Self-funded: --%</p>
            </div>
            </div>

            {/* RIGHT -- top issues */}
            <div className="card">
            <h3 style={{ marginBottom: "12px" }}>Top Issues</h3>
            <p>-- Coming soon --</p>
            <p>-- Coming soon --</p>
            <p>-- Coming soon --</p>
            </div>

        </div>

        {/* BOTTOM -- blurb / platform summary */}
        <div className="card">
            <h3 style={{ marginBottom: "12px" }}>About</h3>
            <p>Platform summary coming soon -- will be populated from news API and LLM analysis.</p>
        </div>

        {/* NEWS SECTION */}
        <div style={{ marginTop: "24px" }}>
            <h2>Recent News</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="card">
                <p style={{ color: "var(--text-muted)" }}>News articles coming soon</p>
            </div>
            </div>
        </div>

        </div>
    )
}

export default function Candidate() {
    return (
        <Suspense fallback={<p style={{ textAlign: "center", marginTop: "48px" }}>Loading...</p>}>
            <CandidateContent />
        </Suspense>
    )
}