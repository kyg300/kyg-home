import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function PostEditor() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEditMode)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getPost(id)
      .then(({ post }) => {
        setTitle(post.title)
        setContent(post.content)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '글을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (isEditMode && id) {
        await api.updatePost(id, title, content)
        navigate(`/board/${id}`)
      } else {
        const { post } = await api.createPost(title, content)
        navigate(`/board/${post.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="status-text">불러오는 중...</p>

  return (
    <section className="page page-narrow">
      <h1>{isEditMode ? '글 수정' : '글쓰기'}</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form-field">
          제목
          <input
            className="form-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          내용
          <textarea
            className="form-input form-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? '저장 중...' : '저장'}
        </button>
      </form>
    </section>
  )
}
