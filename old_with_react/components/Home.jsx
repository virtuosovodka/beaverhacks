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
      
       
    </div>
  )
}

export default Home
