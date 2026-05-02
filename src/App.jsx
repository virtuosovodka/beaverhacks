import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./components/Home"
import Election from "./components/Election"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/election" element={<Election />} />
      </Routes>
    </BrowserRouter>
  )

  
}
export default App 