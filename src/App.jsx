import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./components/Home"
import Election from "./components/Election"
import React, { useState } from 'react'; 


{/*app holds the address state and passes it down to both home and election*/}
function App() {
  const [address, setAddress] = useState("")
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home address={address} setAddress={setAddress} />} />
        <Route path="/election" element={<Election address={address} />} />
      </Routes>
    </BrowserRouter>
  )
}
export default App 