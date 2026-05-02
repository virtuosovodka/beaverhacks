import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function Election({ address }) {
    const [elections, setElections] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    useEffect(() => {
        async function fetchElections() {
            try {
                const res = await fetch(`https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodeURIComponent(address)}&electionId=2000&key=${import.meta.env.VITE_GOOGLE_CIVIC_API_KEY}`)
                const data = await res.json()
                console.log(data)
                setElections(data.elections)
                setLoading(false)
            } catch (err) {
                setError("Failed to load elections")
                setLoading(false)
            }
        }

        fetchElections()
    }, [address])

    if (loading) return <p>Loading elections</p>
    if (error) return <p>{error}</p>


    return (
        <div>
            <h1>Upcoming Elections</h1>
            {elections && elections.map((election) => (
                <div key={election.id}>
                    <h2>{election.name}</h2>
                    <p>{election.electionDay}</p>
                    <button onClick={()=>navigate("/election/${election.id}")}>View Details</button>
                </div>
            ))}
            <p>May 19, 2026</p>
        </div>
    )

    
}
export default Election 