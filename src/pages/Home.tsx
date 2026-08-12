import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, type Post } from '../lib/api'

function snippet(content: string, length = 70) {
  const trimmed = content.trim()
  return trimmed.length > length ? `${trimmed.slice(0, length)}...` : trimmed
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listPosts()
      .then(({ posts }) => setPosts(posts.slice(0, 6)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/board?q=${encodeURIComponent(q)}` : '/board')
  }

  return (
    <div className="home">
      <div className="home-inner">
        <section className="hero">
          <h1 className="hero-title">
            <span className="hero-title-accent">kyg</span>-home
          </h1>
          <p className="hero-tagline">기록하고, 나누고, 다시 찾아보는 공간</p>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              className="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="게시판 글 검색"
              aria-label="게시판 글 검색"
            />
            <button className="search-button" type="submit" aria-label="검색">
              🔍
            </button>
          </form>
          <nav className="quicklinks" aria-label="바로가기">
            <Link to="/board" className="quicklink">
              <span className="quicklink-icon">📋</span>
              <span className="quicklink-label">게시판</span>
            </Link>
            {user ? (
              <Link to="/board/new" className="quicklink">
                <span className="quicklink-icon">✏️</span>
                <span className="quicklink-label">글쓰기</span>
              </Link>
            ) : (
              <Link to="/signup" className="quicklink">
                <span className="quicklink-icon">👤</span>
                <span className="quicklink-label">회원가입</span>
              </Link>
            )}
            {!user && (
              <Link to="/login" className="quicklink">
                <span className="quicklink-icon">🔑</span>
                <span className="quicklink-label">로그인</span>
              </Link>
            )}
          </nav>
        </section>

        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">최근 게시글</h2>
            <Link to="/board" className="section-link">
              전체보기 →
            </Link>
          </div>
          {loading && <p className="status-text">불러오는 중...</p>}
          {!loading && posts.length === 0 && (
            <div className="empty-panel">아직 게시글이 없습니다. 첫 글을 남겨보세요.</div>
          )}
          {!loading && posts.length > 0 && (
            <div className="post-grid">
              {posts.map((post) => (
                <Link key={post.id} to={`/board/${post.id}`} className="post-card">
                  <span className="post-card-title">{post.title}</span>
                  <p className="post-card-snippet">{snippet(post.content)}</p>
                  <span className="post-card-meta">
                    {post.author_username} · {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
