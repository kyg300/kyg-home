import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, type Post } from '../lib/api'

export default function BoardList() {
  const { user } = useAuth()
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
      {!loading && !error && posts.length === 0 && <p className="status-text">아직 글이 없습니다.</p>}
      <ul className="post-list">
        {posts.map((post) => (
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
