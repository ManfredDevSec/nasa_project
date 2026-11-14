import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SelectAstronaut from './pages/SelectAstronaut'
import BodyMap from './pages/BodyMap'
import VisionTest from './pages/VisionTest'
import Result from './pages/Result'
import CrewDashboard from './pages/CrewDashboard'
import EarthReport from './pages/EarthReport'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SelectAstronaut />} />
        <Route path="/astronaut/:id" element={<BodyMap />} />
        <Route path="/astronaut/:id/test" element={<VisionTest />} />
        <Route path="/astronaut/:id/result" element={<Result />} />
        <Route path="/crew" element={<CrewDashboard />} />
        <Route path="/report" element={<EarthReport />} />
      </Routes>
    </BrowserRouter>
  )
}
