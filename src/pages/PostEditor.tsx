import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Attachment } from '../lib/api'
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_POST,
  formatFileSize,
} from '../lib/attachments'

export default function PostEditor() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEditMode)
  const [submitting, setSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getPost(id)
      .then(({ post }) => {
        setTitle(post.title)
        setContent(post.content)
        setExistingAttachments(post.attachments ?? [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : '글을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [id])

  const totalAttachmentCount = existingAttachments.length + newFiles.length

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (selected.length === 0) return

    if (totalAttachmentCount + selected.length > MAX_ATTACHMENTS_PER_POST) {
      setError(`첨부파일은 최대 ${MAX_ATTACHMENTS_PER_POST}개까지 가능합니다`)
      return
    }
    for (const file of selected) {
      if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.includes(file.type)) {
        setError(`지원하지 않는 파일 형식입니다: ${file.name}`)
        return
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setError(`${file.name}의 용량이 너무 큽니다 (최대 ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)})`)
        return
      }
    }
    setError(null)
    setNewFiles((prev) => [...prev, ...selected])
  }

  function removeExisting(attachmentId: string) {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const uploaded = []
      for (let i = 0; i < newFiles.length; i++) {
        setUploadStatus(`첨부파일 업로드 중... (${i + 1}/${newFiles.length})`)
        uploaded.push(await api.uploadAttachment(newFiles[i]))
      }
      setUploadStatus(null)

      if (isEditMode && id) {
        const attachments = [...existingAttachments.map((a) => ({ id: a.id })), ...uploaded]
        await api.updatePost(id, title, content, attachments)
        navigate(`/board/${id}`)
      } else {
        const { post } = await api.createPost(title, content, uploaded)
        navigate(`/board/${post.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setSubmitting(false)
      setUploadStatus(null)
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
        <div className="form-field">
          첨부파일 ({totalAttachmentCount}/{MAX_ATTACHMENTS_PER_POST})
          {(existingAttachments.length > 0 || newFiles.length > 0) && (
            <ul className="attachment-edit-list">
              {existingAttachments.map((a) => (
                <li key={a.id} className="attachment-edit-item">
                  <span className="attachment-edit-name">{a.filename}</span>
                  <span className="attachment-edit-size">{formatFileSize(a.size)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost attachment-remove-btn"
                    onClick={() => removeExisting(a.id)}
                  >
                    삭제
                  </button>
                </li>
              ))}
              {newFiles.map((file, i) => (
                <li key={`new-${i}`} className="attachment-edit-item">
                  <span className="attachment-edit-name">{file.name}</span>
                  <span className="attachment-edit-size">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost attachment-remove-btn"
                    onClick={() => removeNewFile(i)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
          {totalAttachmentCount < MAX_ATTACHMENTS_PER_POST && (
            <input
              className="form-input"
              type="file"
              multiple
              accept={ALLOWED_ATTACHMENT_EXTENSIONS}
              onChange={handleFileSelect}
            />
          )}
        </div>
        {uploadStatus && <p className="status-text">{uploadStatus}</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? '저장 중...' : '저장'}
        </button>
      </form>
    </section>
  )
}
