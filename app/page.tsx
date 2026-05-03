"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ComposableMap, Geographies, Geography, createCoordinates } from "@vnedyalk0v/react19-simple-maps"
import geoData from "../public/us-districts.json"

declare global {
  interface Window {
    google: any
  }
}

export default function Home() {
  // objects for address, error, and navigation tool
  const [address, setAddress] = useState("")
  const [error,   setError]   = useState("")
  const router       = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)  // div where the autocomplete element gets injected
  const elementRef   = useRef<any>(null)             // reference to the PlaceAutocompleteElement itself
  const addressRef   = useRef("")                    // ref copy of address to avoid stale closure in handleSubmit
  const initedRef    = useRef(false)                 // guard to prevent double-init from React strict mode

  useEffect(() => {
    async function initPlaces() {
      // strict mode mounts twice in dev — this guard prevents double init
      if (initedRef.current) return
      initedRef.current = true

      try {
        // check importLibrary is available before calling it
        if (!(window as any).google?.maps?.importLibrary) {
          console.error("importLibrary not available")
          initedRef.current = false  // allow retry
          return
        }

        // load the places library via the new async loader
        const { PlaceAutocompleteElement } = await (window as any).google.maps.importLibrary("places")

        if (!containerRef.current) return

        // create the autocomplete element restricted to US street addresses
        const placeAutocomplete = new PlaceAutocompleteElement({
          componentRestrictions: { country: "us" }, // only us
          types: ["address"],                       // street addy
        })
        placeAutocomplete.placeholder = "Enter your address..."

        containerRef.current.appendChild(placeAutocomplete);
        elementRef.current = placeAutocomplete;
        console.log("autocomplete appended:", containerRef.current.innerHTML)

        // user picks suggestion, integrate it into react state
        placeAutocomplete.addEventListener("gmp-select", async (e: any) => {
          const place = e.placePrediction.toPlace()
          await place.fetchFields({ fields: ["formattedAddress"] })
          const formatted = place.formattedAddress
          console.log("place selected:", formatted)
          if (formatted) {
            addressRef.current = formatted  // set ref first so handleSubmit sees it immediately
            setAddress(formatted)
            setError("")
          }
        })
      } catch (err) {
        console.error("Failed to load Places:", err)
        initedRef.current = false  // allow retry on error
      }
    }

    // only inject the bootstrap loader once
    if (!document.getElementById("google-places-script")) {
      const script = document.createElement("script")
      script.id    = "google-places-script"
      // loading=async is the new recommended pattern — makes importLibrary available
      script.src   = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&loading=async`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    // poll until importLibrary is ready since async loader initializes after onload
    const interval = setInterval(async () => {
      if ((window as any).google?.maps?.importLibrary && containerRef.current) {
        clearInterval(interval)
        await initPlaces()
      }
    }, 100)

    return () => clearInterval(interval)  // cleanup on unmount
  }, [])

  function handleSubmit() {
    // small timeout to let gmp-placeselect finish if user hit Enter immediately after selecting
    setTimeout(() => {
      if (addressRef.current.trim().length > 0) {
        setError("")
        router.push(`/election?address=${encodeURIComponent(addressRef.current)}`)
      } else {
        setError("Please select an address from the suggestions.")
      }
    }, 100)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") handleSubmit()
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center font-sans p-4">
        <h1 className="text-3xl font-bold">Infolection</h1>
      </div>
      <div className="flex flex-col flex-1 items-center justify-center font-serif">
        <h1 className="text-4xl font-sans font-bold">Understand what's on your ballot.</h1>

        {/* Container where PlaceAutocompleteElement gets injected by useEffect */} 
        <div
          ref={containerRef}
          onKeyDown={handleKeyDown}
          className="w-full max-w-lg m-8"
        ></div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 250,
            center: createCoordinates(-96, 38),
          }}
          width={500}
          height={150}
        >
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo, i) => (
                <Geography
                  key={i}
                  geography={geo}
                  fill="#EAEAEC"
                  stroke="#000000"
                  strokeWidth={0.25}
                />
              ))
            }
          </Geographies>
        </ComposableMap>

        <button
          onClick={handleSubmit}
          className="bg-stone-800 font-sans text-zinc-200 px-4 py-2 rounded-md mt-2"
        >
          Get My Ballot
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </>
  )
}