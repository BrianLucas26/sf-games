import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import Landing from '@/routes/Landing'
import CreateGame from '@/routes/CreateGame'
import Join from '@/routes/Join'
import Lobby from '@/routes/Lobby'
import Play from '@/routes/Play'
import NotFound from '@/routes/NotFound'

// Every game registers itself here, once. The rest of the app only ever
// looks games up by slug through src/lib/gameRegistry.ts.
import '@/games/turf-war/register'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="create" element={<CreateGame />} />
          <Route path="join" element={<Join />} />
          <Route path="lobby/:gameId" element={<Lobby />} />
          <Route path="play/:gameId" element={<Play />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
