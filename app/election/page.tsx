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
  positions: string[]
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
    <>
      <div className="flex flex-col items-center justify-center font-sans p-8 w-full">
        <button onClick={() => router.push("/")} className="text-3xl font-bold">Infolection</button>
      </div>
      <div className="flex flex-col items-start justify-start font-serif p-4 pl-16 pr-16">
        <p className="text-sm text-gray-500 mb-2">
          {divisions?.state} - {divisions?.district} Congressional District
        </p>
      </div>
      <div className="flex flex-col items-start justify-start font-serif p-4 pr-32 pl-32">
        <div className="flex flex-col gap-5 mt-8 w-full">
          <h2 className="text-3xl font-bold font-sans">U.S. Senate</h2>
          {/*check for if there actually is little man running*/}
          {senateCandidates.length > 0 ? (
            senateCandidates.map((c, i) => (
                <CandidateCard key={i} candidate={c} onClick={() => router.push(`/candidate?id=${c.candidate_id}`)} />
            ))
            ) : (
            <p className="text-gray-400 text-sm">No candidates found for this state.</p>
            )}

        </div>
        <div className="flex flex-col gap-5 mt-8 w-full">
          <h2 className="text-3xl font-bold font-sans">U.S. House of Representatives</h2>
          {houseCandidates.length > 0 ? (
            houseCandidates.map((c, i) => (
                <CandidateCard key={i} candidate={c} onClick={() => router.push(`/candidate?id=${c.candidate_id}`)} />
            ))
            ) : (
            <p className="text-gray-400 text-sm">No candidates found for this district.</p>
            )}
        </div>
      </div>
    </>
  )
}

export default function Election() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: "48px" }}>Loading...</p>}>
      <ElectionContent />
    </Suspense>
  )
}

function CandidateCard({candidate, onClick} : {candidate: Candidate, onClick?: () => void}) {
  return (
    <div 
      className="cursor-pointer flex w-full flex-row items-center gap-4 p-4 border border-gray-300 rounded-md hover:bg-stone-300 transition-colors" 
      onClick={onClick}
    >
      <h3 className="font-sans text-md font-bold">{candidate.name}</h3>
      <p>{candidate.top_issues.join(", ")}</p>
    </div>
  )
}