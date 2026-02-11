import { Routes, Route, Navigate } from 'react-router-dom'
import Lobby from './pages/Lobby.tsx'
import Game from './pages/Game.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/game/:id" element={<Lobby />} />
      <Route path="/game/:id/live" element={<Game />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
