import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.tsx'
import Layout from './components/Layout.tsx'
import Home from './pages/Home.tsx'
import Lobby from './pages/Lobby.tsx'
import Game from './pages/Game.tsx'
import Leagues from './pages/Leagues.tsx'
import Leaderboard from './pages/Leaderboard.tsx'
import Community from './pages/Community.tsx'
import Help from './pages/Help.tsx'
import Profile from './pages/Profile.tsx'

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leagues/:mode" element={<Leagues />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/community" element={<Community />} />
          <Route path="/help" element={<Help />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/game/:id" element={<Lobby />} />
          <Route path="/game/:id/live" element={<Game />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}
