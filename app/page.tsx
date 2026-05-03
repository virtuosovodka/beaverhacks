
"use client"

import { useState } from "react"
import { useRouter} from "next/navigation"
import Image from "next/image";

export default function Home() {
  // objects for address, error, and navigation tool 
  const [address, setAddress] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  //checks if address is long enough and has a comma 
  function handleSubmit() {
    if (address.length > 10 && address.includes(",")) {
      setError("")
      router.push(`/election?address=${encodeURIComponent(address)}`)
    } else {
      setError("Please enter your full address...")
    }
  }

  //return the validation 
  return (
    <div style={{ textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <h1>Know Before You Vote</h1>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          placeholder="e.g. 123 Main St, Portland, OR 97201"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            setError("")
          }}
        />
        <button onClick={handleSubmit}>Go</button>
      </div>
      {error && <p style={{ color: "var(--accent)" }}>{error}</p>}
    </div>
  )


}
