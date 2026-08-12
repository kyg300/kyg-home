import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, type Post } from '../lib/api'
import { formatFileSize, isImageContentType } from '../lib/attachments'

export default function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getPost(id)
      .then(({ post }) => setPost(post))
      .catch((err) => setError(err instanceof Error ? err.message : '글을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!id || !window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await api.deletePost(id)
      navigate('/board')
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  if (loading) return <p className="status-text">불러오는 중...</p>
  if (error) return <p className="form-error">{error}</p>
  if (!post) return <p className="status-text">글을 찾을 수 없습니다.</p>

  const isAuthor = user?.id === post.user_id
  const images = (post.attachments ?? []).filter((a) => isImageContentType(a.content_type))
  const files = (post.attachments ?? []).filter((a) => !isImageContentType(a.content_type))

  return (
    <section className="page">
      <h1>{post.title}</h1>
      <div className="post-meta">
        {post.author_username} · {new Date(post.created_at).toLocaleString()}
      </div>
      <p className="post-content">{post.content}</p>
      {images.length > 0 && (
        <div className="attachment-image-grid">
          {images.map((a) => (
            <a
              key={a.id}
              href={`/api/attachments/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="attachment-image-link"
            >
              <img src={`/api/attachments/${a.id}`} alt={a.filename} className="attachment-image" />
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="attachment-file-list">
          {files.map((a) => (
            <li key={a.id} className="attachment-file-item">
              <a href={`/api/attachments/${a.id}?download=1`} download={a.filename} className="attachment-file-link">
                📎 {a.filename}
              </a>
              <span className="attachment-edit-size">{formatFileSize(a.size)}</span>
            </li>
          ))}
        </ul>
      )}
      {isAuthor && (
        <div className="post-actions">
          <Link to={`/board/${post.id}/edit`} className="btn btn-secondary">
            수정
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            삭제
          </button>
        </div>
      )}
      <Link to="/board">목록으로</Link>
    </section>
  )
}
