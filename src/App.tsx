import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Itinerary from './pages/Itinerary'
import Family from './pages/Family'
import Budget from './pages/Budget'
import Travel from './pages/Travel'
import Tasks from './pages/Tasks'
import AppLayout from './components/layout/AppLayout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trip/:id" element={<AppLayout />}>
        <Route index element={<Navigate to="itinerary" replace />} />
        <Route path="itinerary" element={<Itinerary />} />
        <Route path="family" element={<Family />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="budget" element={<Budget />} />
        <Route path="travel" element={<Travel />} />
      </Route>
    </Routes>
  )
}

export default App
