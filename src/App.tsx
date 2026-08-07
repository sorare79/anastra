import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TablePreview from './pages/TablePreview'
import { getBasename } from './utils/router'

function App() {
  const basename = getBasename()

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App