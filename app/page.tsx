"use client"

import { useState } from "react"
import { useRouter} from "next/navigation"
import Image from "next/image";

export default function Home() {
  // objects for address, error, and navigation tool 
  const [address, setAddress] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  function validateAddress(address: string) : boolean {
    return address.length > 10 && address.includes(",");
  }

  //checks if address is long enough and has a comma 
  function handleSubmit() {
    if (validateAddress(address)) {
      setError("")
      router.push(`/election?address=${encodeURIComponent(address)}`)
    } else {
      setError("Please enter your full address...")
    }
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center font-serif p-4">
        <h1 className="text-3xl font-bold">Infolection</h1>
      </div>
      <div className="flex flex-col flex-1 items-center justify-center font-serif">
        <h1 className="text-4xl">Understand what's on your ballot.</h1>
        <input type="text" 
          placeholder="Enter your address..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="border border-gray-300 rounded-md p-2 mt-4 w-full max-w-md outline-none focus:ring-2 focus:ring-stone-800"
        />
        <button onClick={handleSubmit} className="bg-stone-800 text-zinc-200 px-4 py-2 rounded-md mt-4">
          Get My Ballot
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </>
  )
}
