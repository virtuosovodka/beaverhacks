"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

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
        const divRes = await fetch(`/district?address=${encodeURIComponent(address ?? "")}`)
        const divData = (await divRes.json())[0]
        //console.log("Division data:", divData)

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

        const electionData = await fetch(`/api/${state}${district}`).then(res => res.json())
        console.log("Election data:", electionData)

        setHouseCandidates(electionData.house)
        setSenateCandidates(electionData.senate)

        // const houseRes = await fetch(
        //   `https://api.open.fec.gov/v1/candidates/?state=${state}&district=${district}&office=H&election_year=2026&api_key=${process.env.FEC_API_KEY}&per_page=20`
        // )
        // const houseData = await houseRes.json()
        // setHouseCandidates(houseData.results)

        // const senateRes = await fetch(
        //   `https://api.open.fec.gov/v1/candidates/?state=${state}&office=S&election_year=2026&api_key=${process.env.FEC_API_KEY}&per_page=20`
        // )
        // const senateData = await senateRes.json()
        // setSenateCandidates(senateData.results)

        // if (houseData.results.length === 0 && senateData.results.length === 0) {
        //   setError("No candidates found. Try including your full city and state.")
        //   setLoading(false)
        //   return
        // }

        setLoading(false)
      } catch (err) {
        console.log(err)
        setError("Failed to load election data")
        setLoading(false)
      }
    }

    if (address) fetchData()
  }, [address])

  if (loading) return <p style={{ textAlign: "center", marginTop: "48px" }}>Loading your ballot...</p>
  if (error) return <p style={{ textAlign: "center", marginTop: "48px", color: "var(--accent)" }}>{error}</p>

  return (
    <div className="page">
      <button onClick={() => router.push("/")} style={{ marginBottom: "24px" }}>
        ← Back
      </button>

      <h1>Your Ballot</h1>
      <p style={{ marginBottom: "32px" }}>
        {divisions?.state} -- Congressional District {divisions?.district}
      </p>

      <h2>U.S. Senate</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
        {senateCandidates.map((c, i) => (
          <div key={i} className="card" style={{ cursor: "pointer" }} onClick={() => router.push(`/candidate?id=${c.candidate_id}`)}>
            <h3>{c.name}</h3>
            <p>{c.top_issues.join(", ")} -- {c.incumbent_challenge_full}</p>
          </div>
        ))}
      </div>

      <h2>U.S. House -- District {divisions?.district}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {houseCandidates.map((c, i) => (
          <div key={i} className="card" style={{ cursor: "pointer" }} onClick={() => router.push(`/candidate?id=${c.candidate_id}`)}>
            <h3>{c.name}</h3>
            <p>{c.top_issues.join(", ")} -- {c.incumbent_challenge_full}</p>
          </div>
        ))}
      </div>
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