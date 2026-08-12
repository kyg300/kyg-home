import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import BoardList from './pages/BoardList'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import PostDetail from './pages/PostDetail'
import PostEditor from './pages/PostEditor'
import Signup from './pages/Signup'

function App() {
  return (
    <>
      <Navbar />
      <main className="main-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/board" element={<BoardList />} />
          <Route
            path="/board/new"
            element={
              <ProtectedRoute>
                <PostEditor />
              </ProtectedRoute>
            }
          />
          <Route path="/board/:id" element={<PostDetail />} />
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
