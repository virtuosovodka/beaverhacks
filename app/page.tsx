"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ComposableMap,
  Geographies,
  Geography,
  createCoordinates,
} from "@vnedyalk0v/react19-simple-maps"
import { geoPath, geoMercator } from "d3-geo"
import districtData from "../public/us-districts.json"
import stateData    from "../public/us-states.json"
import type { FeatureCollection } from "geojson"
import Image from "next/image"

declare global {
  interface Window { google: any }
}

const DISTRICT_COLORS = [
  "#4E79A7","#F28E2B","#E15759","#76B7B2","#59A14F",
  "#EDC948","#B07AA1","#FF9DA7","#9C755F","#BAB0AC",
]

const MAP_WIDTH  = 800
const MAP_HEIGHT = 400

function buildBaseProjection() {
  return geoMercator()
    .scale(130)
    .center([-96, 38])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
}

const FIPS_TO_ABBR: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY",
}
function stateAbbrFromFips(fips: string) { return FIPS_TO_ABBR[fips] ?? fips }

function computeZoomForState(stateFips: string) {
  const features = (districtData as FeatureCollection).features.filter(
    (f) => (f.properties as any).STATEFP20 === stateFips
  )
  if (!features.length) return { zoom: 1, center: [-96, 38] as [number, number] }

  const proj    = buildBaseProjection()
  const pathGen = geoPath(proj)

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const f of features) {
    const b = pathGen.bounds(f as any)
    if (!b) continue
    minX = Math.min(minX, b[0][0]); minY = Math.min(minY, b[0][1])
    maxX = Math.max(maxX, b[1][0]); maxY = Math.max(maxY, b[1][1])
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const [lon, lat] = proj.invert!([cx, cy]) as [number, number]

  const scaleX = (MAP_WIDTH  * 0.75) / (maxX - minX)
  const scaleY = (MAP_HEIGHT * 0.75) / (maxY - minY)

  return { zoom: Math.min(scaleX, scaleY), center: [lon, lat] as [number, number] }
}

export default function Home() {
  const [address,      setAddress]      = useState("")
  const [error,        setError]        = useState("")
  const [selectedFips, setSelectedFips] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [zoomCfg,      setZoomCfg]      = useState({ zoom: 5, center: [-96, 38] as [number,number] })
  const [hoveredFips,  setHoveredFips]  = useState<string | null>(null)
  const [locked,       setLocked]       = useState(false)

  const router       = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const addressRef   = useRef("")
  const initedRef    = useRef(false)

  useEffect(() => {
    async function initPlaces() {
      if (initedRef.current) return
      initedRef.current = true
      try {
        if (!(window as any).google?.maps?.importLibrary) { initedRef.current = false; return }
        const { PlaceAutocompleteElement } = await (window as any).google.maps.importLibrary("places")
        if (!containerRef.current) return
        const el = new PlaceAutocompleteElement({ componentRestrictions: { country: "us" }, types: ["address"] })
        el.placeholder = "Enter your address..."
        containerRef.current.appendChild(el)
        el.addEventListener("gmp-select", async (e: any) => {
          const place = e.placePrediction.toPlace()
          await place.fetchFields({ fields: ["formattedAddress"] })
          const fmt = place.formattedAddress
          if (fmt) { addressRef.current = fmt; setAddress(fmt); setError("") }
        })
      } catch (err) { console.error(err); initedRef.current = false }
    }

    if (!document.getElementById("google-places-script")) {
      const s = document.createElement("script")
      s.id = "google-places-script"
      s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&loading=async`
      s.async = true; s.defer = true
      document.head.appendChild(s)
    }
    const iv = setInterval(async () => {
      if ((window as any).google?.maps?.importLibrary && containerRef.current) {
        clearInterval(iv); await initPlaces()
      }
    }, 100)
    return () => clearInterval(iv)
  }, [])

  function handleSubmit() {
    setTimeout(() => {
      if (addressRef.current.trim()) { setError(""); router.push(`/election?address=${encodeURIComponent(addressRef.current)}`) }
      else setError("Please select an address from the suggestions.")
    }, 100)
  }

  const zoomToState = useCallback((fips: string, name: string) => {
    if (locked) return
    setLocked(true)
    setSelectedFips(fips)
    setSelectedName(name)
    setZoomCfg(computeZoomForState(fips))
    setTimeout(() => setLocked(false), 500)
  }, [locked])

  const zoomOut = useCallback(() => {
    if (locked) return
    setLocked(true)
    setSelectedFips(null)
    setSelectedName(null)
    setZoomCfg({ zoom: 5, center: [-96, 38] })
    setTimeout(() => setLocked(false), 500)
  }, [locked])

  const stateDistricts = selectedFips
    ? (districtData as FeatureCollection).features.filter(
        (f) => (f.properties as any).STATEFP20 === selectedFips
      )
    : []

  const projCfg = {
    scale:  130 * zoomCfg.zoom,
    center: createCoordinates(zoomCfg.center[0], zoomCfg.center[1]),
  }

  return (
    <>
      <Logo />
      <div className="flex flex-col flex-1 items-center justify-center font-serif">
        <h1 className="text-4xl font-sans font-bold">Understand what&apos;s on your ballot.</h1>

        <div ref={containerRef} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} className="w-full max-w-lg m-8" />

        <div className="flex items-center gap-3 mb-1 h-8 font-sans text-sm">
          {selectedFips ? (
            <>
              <button onClick={zoomOut} className="px-3 py-1 rounded bg-stone-200 hover:bg-stone-300 transition-colors">
                ← All States
              </button>
              <span className="text-stone-600">
                <strong>{selectedName}</strong> — {stateDistricts.length} Congressional District{stateDistricts.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="text-stone-400 text-xs">Click a state to see its congressional districts</span>
          )}
        </div>

        <div style={{ width: MAP_WIDTH, maxWidth: "100%", position: "relative" }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={projCfg}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            style={{ transition: "all 0.45s cubic-bezier(0.4,0,0.2,1)" }}
          >
            {!selectedFips && (
              <Geographies geography={stateData as any}>
                {({ geographies }) =>
                  geographies.map((geo, i) => {
                    const fips = (geo.properties as any).STATEFP20 as string
                    const name = (geo.properties as any).name as string
                    const isHov = fips === hoveredFips
                    return (
                      <Geography
                        key={(geo as any).rsmKey ?? i}
                        geography={geo}
                        fill={isHov ? "#A8B4C8" : "#EAEAEC"}
                        stroke="#000000"
                        strokeWidth={0.4}
                        style={{
                          default: { outline: "none", cursor: "pointer", transition: "fill 0.15s" },
                          hover:   { outline: "none", cursor: "pointer", fill: "#A8B4C8" },
                          pressed: { outline: "none" },
                        }}
                        onClick={() => zoomToState(fips, name)}
                        onMouseEnter={() => setHoveredFips(fips)}
                        onMouseLeave={() => setHoveredFips(null)}
                      />
                    )
                  })
                }
              </Geographies>
            )}

            {selectedFips && (
              <Geographies geography={districtData as any}>
                {({ geographies }) => {
                  const visible = geographies.filter(
                    (g) => (g.properties as any).STATEFP20 === selectedFips
                  )
                  return visible.map((geo, i) => (
                    <Geography
                      key={(geo as any).rsmKey ?? i}
                      geography={geo}
                      fill={DISTRICT_COLORS[i % DISTRICT_COLORS.length]}
                      stroke="#ffffff"
                      strokeWidth={0.8}
                      style={{
                        default: { outline: "none", cursor: "pointer" },
                        hover:   { outline: "none", cursor: "pointer", opacity: 0.75 },
                        pressed: { outline: "none" },
                      }}
                      onClick={() => {
                        const props = geo.properties as any
                        const stateAbbr = stateAbbrFromFips(selectedFips!)
                        const districtNum = props.CD118FP.padStart(2, "0")
                        router.push(`/election?district=${stateAbbr}${districtNum}`)
                      }}
                    />
                  ))
                }}
              </Geographies>
            )}
          </ComposableMap>
        </div>

        {selectedFips && stateDistricts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 max-w-2xl justify-center">
            {stateDistricts.map((f, i) => (
              <div key={i} className="flex items-center gap-1 font-sans text-xs">
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                  backgroundColor: DISTRICT_COLORS[i % DISTRICT_COLORS.length],
                }} />
                <span className="text-stone-700">{(f.properties as any).NAMELSAD20}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="bg-stone-800 
          font-sans 
          text-zinc-200 
          px-4 
          py-2  
          rounded-md 
          mt-2 
          hover:bg-stone-900
          transition-colors"
        >
          Get My Ballot
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </>
  )
}

export function Logo() {
  return (
    <div className="flex flex-row items-center justify-center font-sans p-4">
      <Image src="/logo.png" alt="logo" width={32} height={32}></Image>
      <h1 className="text-3xl font-bold">Electable</h1>
    </div>
  )
}
