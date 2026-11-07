import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import BoardList from './pages/BoardList'
import Home from './pages/Home'
import Login from './pages/Login'
import MapPage from './pages/MapPage'
import NewsPage from './pages/NewsPage'
import NotFound from './pages/NotFound'
import PostDetail from './pages/PostDetail'
import PostEditor from './pages/PostEditor'
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
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <StockPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/translate"
            element={
              <ProtectedRoute>
                <TranslatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/news"
            element={
              <ProtectedRoute>
                <NewsPage />
              </ProtectedRoute>
            }
          />
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
