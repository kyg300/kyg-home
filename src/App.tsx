import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import BoardList from './pages/BoardList'
import Home from './pages/Home'
import Login from './pages/Login'
import MapPage from './pages/MapPage'
import NotFound from './pages/NotFound'
import PostDetail from './pages/PostDetail'
import PostEditor from './pages/PostEditor'
import Signup from './pages/Signup'
import StockPage from './pages/StockPage'
import TranslatePage from './pages/TranslatePage'

function App() {
  return (
    <>
      <Navbar />
      <main className="main-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/translate" element={<TranslatePage />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/board"
            element={
              <ProtectedRoute>
                <BoardList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/new"
            element={
              <ProtectedRoute>
                <PostEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:id"
            element={
              <ProtectedRoute>
                <PostDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:id/edit"
            element={
              <ProtectedRoute>
                <PostEditor />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  )
}

export default App
