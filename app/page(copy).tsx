"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  ZoomableGroup,
  createCoordinates 
} from "@vnedyalk0v/react19-simple-maps";
import { geoCentroid } from "d3-geo"; 

const fipsToState: Record<string, string> = {
  "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas", "06": "California",
  "08": "Colorado", "09": "Connecticut", "10": "Delaware", "11": "District of Columbia",
  "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho", "17": "Illinois",
  "18": "Indiana", "19": "Iowa", "20": "Kansas", "21": "Kentucky", "22": "Louisiana",
  "23": "Maine", "24": "Maryland", "25": "Massachusetts", "26": "Michigan", "27": "Minnesota",
  "28": "Mississippi", "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
  "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York",
  "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma",
  "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina",
  "46": "South Dakota", "47": "Tennessee", "48": "Texas", "49": "Utah", "50": "Vermont",
  "51": "Virginia", "53": "Washington", "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming",
  "72": "Puerto Rico"
};

const statesGeoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export default function Home() {
  // --- STATE VARIABLES ---
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const [position, setPosition] = useState({ coordinates: [-96, 38], zoom: 1 });
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // --- HANDLERS ---
  function validateAddress(addr: string) : boolean {
    return addr.length > 10 && addr.includes(",");
  }

  // This is the function TypeScript couldn't find
  function handleSubmit() {
    if (validateAddress(address)) {
      setError("");
      router.push(`/election?address=${encodeURIComponent(address)}`);
    } else {
      setError("Please enter your full address...");
    }
  }

  const handleStateClick = (geo: any) => {
    const centroid = geoCentroid(geo);
    const stateName = geo.properties?.name; 

    if (selectedState === stateName) {
      setSelectedState(null);
      setPosition({ coordinates: [-96, 38], zoom: 1 });
    } else {
      setSelectedState(stateName);
      // Zoom level 6.0 makes the state much bigger on screen
      setPosition({ coordinates: [centroid[0], centroid[1]], zoom: 6.0 }); 
    }
  };

  const handleDistrictClick = (geo: any) => {
    const districtName = geo.properties?.NAMELSAD || geo.properties?.name || "Selected District";
    setSelectedDistrict(districtName);
  };

  return (
    <div className="flex flex-col items-center min-h-screen">
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold">Infolection</h1>
        <h2 className="text-4xl font-bold mt-4 font-sans">Understand what's on your ballot.</h2>
      </div>
      
      <div className="w-full max-w-4xl px-4 relative">
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xl bg-white aspect-[2/1]">
          <ComposableMap projection="geoAlbersUsa" style={{ width: "100%", height: "100%", outline: "none" }}>
            <ZoomableGroup 
              zoom={position.zoom} 
              center={createCoordinates(position.coordinates[0], position.coordinates[1])} 
              className="transition-all duration-700 ease-in-out"
            >
              <Geographies geography={statesGeoUrl}>
                {({ geographies }) =>
                  geographies.map((geo, i) => {
                    const isFaded = selectedState && selectedState !== geo.properties?.name;
                    return (
                      <Geography
                        key={`state-${i}`}
                        geography={geo}
                        onClick={() => handleStateClick(geo)}
                        style={{
                          default: { outline: "none", fill: isFaded ? "#F5F5F5" : "#EAEAEC", stroke: "#D1D1D1", strokeWidth: 0.5 },
                          hover: { outline: "none", fill: "#93c5fd", stroke: "#FFFFFF" },
                          pressed: { outline: "none", fill: "#2563eb", stroke: "#FFFFFF" }
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {selectedState && (
                <Geographies geography="/us-districts.json">
                  {({ geographies }) =>
                    geographies
                      .filter((geo) => fipsToState[geo.properties?.STATEFP] === selectedState)
                      .map((geo, i) => {
                        const dName = geo.properties?.NAMELSAD || geo.properties?.name;
                        const isSelected = selectedDistrict === dName;
                        return (
                          <Geography
                            key={`district-${i}`}
                            geography={geo}
                            onClick={() => handleDistrictClick(geo)}
                            style={{
                              default: { outline: "none", fill: isSelected ? "#2563eb" : "rgba(59, 130, 246, 0.1)", stroke: "#3b82f6", strokeWidth: 0.2 },
                              hover: { outline: "none", fill: "rgba(59, 130, 246, 0.4)" },
                              pressed: { outline: "none", fill: "#1d4ed8" }
                            }}
                          />
                        );
                      })
                  }
                </Geographies>
              )}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Selected Info Popup */}
        {selectedDistrict && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white p-4 rounded-xl shadow-2xl border flex justify-between items-center z-50">
             <div className="font-sans">
                <p className="font-bold">{selectedDistrict}</p>
                <p className="text-xs text-gray-500">View your candidates</p>
             </div>
             <button onClick={() => router.push(`/election?district=${selectedDistrict}`)} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">
               Go →
             </button>
          </div>
        )}
      </div>

      {/* Address Input Section */}
      <div className="mt-12 w-full max-w-md px-4 pb-20">
        <p className="text-center text-gray-400 font-bold mb-4 font-sans">OR USE YOUR ADDRESS</p>
        <input 
          type="text" 
          placeholder="Enter full address..." 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border-2 border-gray-100 rounded-xl p-4 focus:border-black outline-none transition-all"
        />
        <button onClick={handleSubmit} className="w-full bg-black text-white p-4 rounded-xl mt-4 font-bold font-sans">
          Get My Ballot
        </button>
        {error && <p className="text-red-500 text-center mt-2 font-bold font-sans">{error}</p>}
      </div>
    </div>
  );
}