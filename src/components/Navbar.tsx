import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        kyg-home
      </Link>
      <div className="navbar-links">
        <Link to="/board">게시판</Link>
        <Link to="/map">지도</Link>
        <Link to="/stock">시세</Link>
        <Link to="/translate">번역</Link>
        <Link to="/news">스포츠</Link>
        {user ? (
          <>
            <span className="navbar-user">{user.username}님</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link to="/login">로그인</Link>
            <Link to="/signup">회원가입</Link>
          </>
        )}
      </div>
    </nav>
  )
}
