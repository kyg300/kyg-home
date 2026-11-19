import { useEffect, useState, type FormEvent } from 'react'
import { api, type Dday, type Memo, type Todo } from '../lib/api'
import { daysUntil, ddayLabel, todayString } from '../lib/dday'

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function sortTodos(items: Todo[]) {
  return [...items].sort((a, b) => Number(a.done) - Number(b.done) || a.created_at.localeCompare(b.created_at))
}

function TodoSection() {
  const [items, setItems] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listTodos()
      .then(({ items }) => setItems(items))
      .catch((err) => setError(errorMessage(err, '할 일을 불러오지 못했습니다')))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    try {
      const { item } = await api.createTodo(value)
      setItems((prev) => sortTodos([...prev, item]))
      setText('')
      setError(null)
    } catch (err) {
      setError(errorMessage(err, '추가하지 못했습니다'))
    }
  }

  async function handleToggle(todo: Todo) {
    setItems((prev) => sortTodos(prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t))))
    try {
      await api.updateTodo(todo.id, { done: !todo.done })
    } catch (err) {
      setItems((prev) => sortTodos(prev.map((t) => (t.id === todo.id ? todo : t))))
      setError(errorMessage(err, '변경하지 못했습니다'))
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteTodo(id)
      setItems((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(errorMessage(err, '삭제하지 못했습니다'))
    }
  }

  async function handleClearDone() {
    const done = items.filter((t) => t.done)
    const results = await Promise.allSettled(done.map((t) => api.deleteTodo(t.id)))
    const removed = new Set(done.filter((_, i) => results[i].status === 'fulfilled').map((t) => t.id))
    setItems((prev) => prev.filter((t) => !removed.has(t.id)))
    if (removed.size < done.length) setError('일부 항목을 삭제하지 못했습니다')
  }

  const doneCount = items.filter((t) => t.done).length

  return (
    <section className="notes-section">
      <div className="section-header">
        <h2 className="section-title">할 일</h2>
        {doneCount > 0 && (
          <button type="button" className="btn btn-ghost btn-small" onClick={handleClearDone}>
            완료 {doneCount}개 지우기
          </button>
        )}
      </div>
      <form className="inline-form" onSubmit={handleAdd}>
        <input
          className="form-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="할 일을 입력하세요"
          maxLength={500}
          aria-label="새 할 일"
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          추가
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {loading && <p className="status-text">불러오는 중...</p>}
      {!loading && items.length === 0 && <p className="status-text">할 일이 없어요.</p>}
      <ul className="todo-list">
        {items.map((todo) => (
          <li key={todo.id} className={todo.done ? 'todo-item todo-done' : 'todo-item'}>
            <label className="todo-label">
              <input type="checkbox" checked={todo.done} onChange={() => handleToggle(todo)} />
              <span>{todo.text}</span>
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => handleDelete(todo.id)}
              aria-label={`${todo.text} 삭제`}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DdaySection() {
  const [items, setItems] = useState<Dday[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayString())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listDdays()
      .then(({ items }) => setItems(items))
      .catch((err) => setError(errorMessage(err, 'D-day를 불러오지 못했습니다')))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    try {
      const { item } = await api.createDday(title.trim(), date)
      setItems((prev) => [...prev, item].sort((a, b) => a.target_date.localeCompare(b.target_date)))
      setTitle('')
      setError(null)
    } catch (err) {
      setError(errorMessage(err, '추가하지 못했습니다'))
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteDday(id)
      setItems((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(errorMessage(err, '삭제하지 못했습니다'))
    }
  }

  // 다가오는 날을 먼저, 지난 날은 뒤에 (최근에 지난 순)
  const upcoming = items.filter((d) => daysUntil(d.target_date) >= 0)
  const past = items.filter((d) => daysUntil(d.target_date) < 0).reverse()

  return (
    <section className="notes-section">
      <div className="section-header">
        <h2 className="section-title">D-day</h2>
      </div>
      <form className="inline-form" onSubmit={handleAdd}>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 여행, 시험, 기념일"
          maxLength={500}
          aria-label="D-day 이름"
        />
        <input
          className="form-input dday-date-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="날짜"
          required
        />
        <button type="submit" className="btn btn-primary" disabled={!title.trim() || !date}>
          추가
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {loading && <p className="status-text">불러오는 중...</p>}
      {!loading && items.length === 0 && <p className="status-text">등록된 D-day가 없어요.</p>}
      <ul className="dday-list">
        {[...upcoming, ...past].map((d) => {
          const isPast = daysUntil(d.target_date) < 0
          return (
            <li key={d.id} className={isPast ? 'card dday-item dday-past' : 'card dday-item'}>
              <span className="dday-badge dday-badge-lg">{ddayLabel(d.target_date)}</span>
              <span className="dday-body">
                <span className="dday-title">{d.title}</span>
                <span className="status-text dday-date">{d.target_date.replaceAll('-', '.')}</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => handleDelete(d.id)}
                aria-label={`${d.title} 삭제`}
              >
                삭제
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function MemoSection() {
  const [items, setItems] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listMemos()
      .then(({ items }) => setItems(items))
      .catch((err) => setError(errorMessage(err, '메모를 불러오지 못했습니다')))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    try {
      const { item } = await api.createMemo(draft)
      setItems((prev) => [item, ...prev])
      setDraft('')
      setError(null)
    } catch (err) {
      setError(errorMessage(err, '저장하지 못했습니다'))
    }
  }

  async function handleSave(id: string) {
    if (!editText.trim()) return
    try {
      const { item } = await api.updateMemo(id, editText)
      setItems((prev) => [item, ...prev.filter((m) => m.id !== id)])
      setEditingId(null)
      setError(null)
    } catch (err) {
      setError(errorMessage(err, '저장하지 못했습니다'))
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteMemo(id)
      setItems((prev) => prev.filter((m) => m.id !== id))
      if (editingId === id) setEditingId(null)
    } catch (err) {
      setError(errorMessage(err, '삭제하지 못했습니다'))
    }
  }

  return (
    <section className="notes-section">
      <div className="section-header">
        <h2 className="section-title">메모</h2>
      </div>
      <form className="form" onSubmit={handleAdd}>
        <textarea
          className="form-input form-textarea"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="메모를 남겨보세요"
          maxLength={5000}
          aria-label="새 메모"
        />
        <div>
          <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
            저장
          </button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}
      {loading && <p className="status-text">불러오는 중...</p>}
      {!loading && items.length === 0 && <p className="status-text">메모가 없어요.</p>}
      <ul className="memo-list">
        {items.map((memo) => (
          <li key={memo.id} className="card memo-item">
            {editingId === memo.id ? (
              <>
                <textarea
                  className="form-input form-textarea memo-edit"
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={5000}
                  aria-label="메모 수정"
                  autoFocus
                />
                <div className="memo-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={() => handleSave(memo.id)}
                    disabled={!editText.trim()}
                  >
                    저장
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditingId(null)}>
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="memo-content">{memo.content}</p>
                <div className="memo-actions">
                  <span className="status-text memo-date">{new Date(memo.updated_at).toLocaleString()}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      setEditingId(memo.id)
                      setEditText(memo.content)
                    }}
                  >
                    수정
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => handleDelete(memo.id)}>
                    삭제
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function NotesPage() {
  return (
    <section className="page">
      <h1>기록</h1>
      <TodoSection />
      <DdaySection />
      <MemoSection />
    </section>
  )
}
