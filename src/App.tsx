import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import Landing from '@/routes/Landing'
import NotFound from '@/routes/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
