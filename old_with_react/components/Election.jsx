import { useEffect, useState } from "react"

function Election({ address }) {
    const [divisions, setDivisions] = useState(null)
    const [houseCandidates, setHouseCandidates] = useState([])
    const [senateCandidates, setSenateCandidates] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        async function fetchData() {
            try {
                // step 1: get divisions for address
                const divRes = await fetch(
                    `https://www.googleapis.com/civicinfo/v2/divisionsByAddress?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_CIVIC_API_KEY}`
                )
                const divData = await divRes.json()

                // step 2: extract state and congressional district
                const state = divData.normalizedInput.state
                let congressionalDistrict = null

                for (const key of Object.keys(divData.divisions)) {
                    const match = key.match(/\/cd:(\d+)/)
                    if (match) {
                        congressionalDistrict = match[1].padStart(2, "0")
                        break
                    }
                }

                setDivisions({ state, congressionalDistrict })

                // step 3: fetch house candidates
                const houseRes = await fetch(
                    `https://api.open.fec.gov/v1/candidates/?state=${state}&district=${congressionalDistrict}&office=H&election_year=2026&api_key=DEMO_KEY&per_page=20`
                )
                const houseData = await houseRes.json()
                setHouseCandidates(houseData.results)

                // step 4: fetch senate candidates
                const senateRes = await fetch(
                    `https://api.open.fec.gov/v1/candidates/?state=${state}&office=S&election_year=2026&api_key=DEMO_KEY&per_page=20`
                )
                const senateData = await senateRes.json()
                setSenateCandidates(senateData.results)

                setLoading(false)
            } catch (err) {
                console.log("error:", err)
                setError("Failed to load election data")
                setLoading(false)
            }
        }

        if (address) {
            fetchData()
        } 
        setHouseCandidates(houseData.results)
        setSenateCandidates(senateData.results)

        if (houseData.results.length === 0 && senateData.results.length === 0) {
            setError("No candidates found for your address. Try including your full city and state.")
            setLoading(false)
            return
        }
    }, [address])

    if (loading) return <p>Loading elections...</p>
    if (error) return <p>{error}</p>

    return (
        <div>
            <h1>Your Election</h1>
            <p>State: {divisions?.state}</p>
            <p>Congressional District: {divisions?.congressionalDistrict}</p>

            <h2>U.S. Senate</h2>
            {senateCandidates.map((candidate, i) => (
                <div key={i}>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.party_full}</p>
                    <p>{candidate.incumbent_challenge_full}</p>
                </div>
            ))}

            <h2>U.S. House -- District {divisions?.congressionalDistrict}</h2>
            {houseCandidates.map((candidate, i) => (
                <div key={i}>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.party_full}</p>
                    <p>{candidate.incumbent_challenge_full}</p>
                </div>
            ))}
        </div>
    )
}

export default Election

//start with enter address, use google's div by address and returns political district
// fec api, take state and district to extract and hit the fec candidates 
//display by mapping over results 