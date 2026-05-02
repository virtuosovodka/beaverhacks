import { useState } from 'react'
import { useNavigate } from "react-router-dom"

function Home() {
  const [zip, setZip] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()
  const [error, setError] = useState("")

  function handleSubmit() {
    if (zip.length === 5){
      setSubmitted(true)
      console.log("submitted!")
    } else {
        setError("Please enter a valid 5-digit zip code")
    }
  }
  
  return (
    <div>
      {/* enter in zip code */}
      <h1>Know Before You Vote</h1>
      <input placeholder = "Enter your zip code" value={zip} onChange={(e) => setZip(e.target.value)} maxLength={5}/>
      <button onClick={handleSubmit}>Go</button> 
      {error && <p>{error}</p>}

      {/*After zip is submitted*/}
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
