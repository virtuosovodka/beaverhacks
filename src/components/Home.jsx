import { useState } from 'react'
import { useNavigate } from "react-router-dom"

function Home({address, setAddress}) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  
    function handleSubmit() {
    if (address.length > 10 && (address.includes(",") )) {
        setError("")
        setSubmitted(true)
    } else {
        setError("Please enter your full address including city and state (e.g. 123 Main St, Portland, OR)")
    }
    }

  return (
    <div>
      {/* enter in addrfess  */}
      <h1>Know Before You Vote</h1>
      <input placeholder="Enter your full address" value={address} onChange={(e) => { setAddress(e.target.value); setError("")}} style={{width:"400px", padding:"8px"}}/>
      <button onClick={handleSubmit}>Go</button> 
      {error && <p>{error}</p>}

      {/*After address is submitted*/}
      {submitted && (
        <div>
          {/*Why it matters*/}
          <h2>Why this matters</h2>
          <p>Oregon's May 19th closed primary determines who appears on the November ballot. Only registered Democrats and Republicans can vote in their respective primaries. Independent and nonaffiliate voters cannot participate unless they re-register by April 29th.</p>

          {/*Upcoming Election Card*/}
          <div>
            <h2>Upcoming Election</h2>
            <h3>Oregon Closed Primary</h3>
            <p>May 19, 2026</p>
            <p>
              Voters in your area will choose candidates for state and local offices including Governor, State Legislature, and local races
            </p>
            <button onClick={() => {
                navigate("/election")
                }}>View Election Details</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
