import { Routes, Route } from 'react-router-dom'
import Lobby from './pages/Lobby.tsx'
import Game from './pages/Game.tsx'

function Home() {
  return (
    <div style={{ padding: 32, color: 'var(--muted)' }}>
      <h1 style={{ color: 'white', marginBottom: 8 }}>outrank.xyz</h1>
      <p>Enter a game URL to join: <code>/game/&lt;id&gt;</code></p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game/:id" element={<Lobby />} />
      <Route path="/game/:id/live" element={<Game />} />
    </Routes>
  )
}
