import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, type Dday, type Post, type Todo, type Weather } from '../lib/api'
import { daysUntil, ddayLabel } from '../lib/dday'
import { readStorage, WEATHER_CITY_KEY } from '../lib/storage'

function snippet(content: string, length = 70) {
  const trimmed = content.trim()
  return trimmed.length > length ? `${trimmed.slice(0, length)}...` : trimmed
}

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [ddays, setDdays] = useState<Dday[]>([])

  useEffect(() => {
    if (!user) {
      setPosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .listPosts()
      .then(({ posts }) => setPosts(posts.slice(0, 6)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) {
      setWeather(null)
      return
    }
    api
      .getWeather(readStorage(WEATHER_CITY_KEY) ?? undefined)
      .then(setWeather)
      .catch(() => setWeather(null))
  }, [user])

  useEffect(() => {
    if (!user) {
      setTodos([])
      setDdays([])
      return
    }
    api
      .listTodos()
      .then(({ items }) => setTodos(items.filter((t) => !t.done)))
      .catch(() => setTodos([]))
    api
      .listDdays()
      .then(({ items }) => setDdays(items.filter((d) => daysUntil(d.target_date) >= 0).slice(0, 3)))
      .catch(() => setDdays([]))
  }, [user])

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
          {weather && (
            <Link to="/weather" className="weather-widget" title="날씨 자세히 보기">
              <span className="weather-icon">{weather.icon}</span>
              <span className="weather-temp">{Math.round(weather.temperature)}°C</span>
              <span className="weather-condition">{weather.condition}</span>
              <span className="weather-range">
                최고 {Math.round(weather.todayMax)}° / 최저 {Math.round(weather.todayMin)}°
              </span>
              <span className="weather-location">{weather.location}</span>
            </Link>
          )}
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
            {user && (
              <Link to="/board/new" className="quicklink">
                <span className="quicklink-icon">✏️</span>
                <span className="quicklink-label">글쓰기</span>
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

        {user && (
          <section className="home-section">
            <div className="section-header">
              <h2 className="section-title">오늘</h2>
              <Link to="/notes" className="section-link">
                기록 열기 →
              </Link>
            </div>
            <div className="today-grid">
              <Link to="/notes" className="post-card today-card">
                <span className="post-card-title">할 일 {todos.length}개 남음</span>
                {todos.length === 0 ? (
                  <p className="post-card-snippet">남은 할 일이 없어요.</p>
                ) : (
                  <ul className="today-list">
                    {todos.slice(0, 3).map((t) => (
                      <li key={t.id}>{t.text}</li>
                    ))}
                  </ul>
                )}
              </Link>
              <Link to="/notes" className="post-card today-card">
                <span className="post-card-title">다가오는 D-day</span>
                {ddays.length === 0 ? (
                  <p className="post-card-snippet">등록된 D-day가 없어요.</p>
                ) : (
                  <ul className="today-list">
                    {ddays.map((d) => (
                      <li key={d.id}>
                        <strong className="dday-badge">{ddayLabel(d.target_date)}</strong> {d.title}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            </div>
          </section>
        )}

        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">최근 게시글</h2>
            <Link to="/board" className="section-link">
              전체보기 →
            </Link>
          </div>
          {authLoading && <p className="status-text">불러오는 중...</p>}
          {!authLoading && !user && (
            <div className="empty-panel">
              <p>로그인하면 게시글을 볼 수 있어요.</p>
              <Link to="/login" className="btn btn-primary">
                로그인하러 가기
              </Link>
            </div>
          )}
          {!authLoading && user && loading && <p className="status-text">불러오는 중...</p>}
          {!authLoading && user && !loading && posts.length === 0 && (
            <div className="empty-panel">아직 게시글이 없습니다. 첫 글을 남겨보세요.</div>
          )}
          {!authLoading && user && !loading && posts.length > 0 && (
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
