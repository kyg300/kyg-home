import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, type Post } from '../lib/api'

export default function BoardList() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listPosts()
      .then(({ posts }) => setPosts(posts))
      .catch((err) => setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return posts
    return posts.filter(
      (post) => post.title.toLowerCase().includes(q) || post.content.toLowerCase().includes(q),
    )
  }, [posts, query])

  function clearSearch() {
    setSearchParams({})
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1>게시판</h1>
        {user && (
          <Link to="/board/new" className="btn btn-primary">
            글쓰기
          </Link>
        )}
      </div>
      {loading && <p className="status-text">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && query && (
        <div className="search-result-banner">
          <span>
            &ldquo;{query}&rdquo; 검색 결과 {filteredPosts.length}건
          </span>
          <button type="button" className="btn btn-ghost" onClick={clearSearch}>
            전체보기
          </button>
        </div>
      )}
      {!loading && !error && filteredPosts.length === 0 && (
        <p className="status-text">{query ? '검색 결과가 없습니다.' : '아직 글이 없습니다.'}</p>
      )}
      <ul className="post-list">
        {filteredPosts.map((post) => (
          <li key={post.id} className="card">
            <Link to={`/board/${post.id}`} className="post-title">
              {post.title}
            </Link>
            <div className="post-meta">
              {post.author_username} · {new Date(post.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
