import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: '영어' },
  { code: 'ja', label: '일본어' },
  { code: 'zh-CN', label: '중국어(간체)' },
  { code: 'fr', label: '프랑스어' },
  { code: 'de', label: '독일어' },
  { code: 'es', label: '스페인어' },
  { code: 'vi', label: '베트남어' },
  { code: 'th', label: '태국어' },
]

const MAX_BYTES = 480

function byteLength(text: string) {
  return new TextEncoder().encode(text).length
}

export default function TranslatePage() {
  const [sourceLang, setSourceLang] = useState('ko')
  const [targetLang, setTargetLang] = useState('en')
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const textBytes = byteLength(sourceText)
  const overLimit = textBytes > MAX_BYTES

  async function handleTranslate(e: FormEvent) {
    e.preventDefault()
    if (!sourceText.trim() || overLimit) return
    setLoading(true)
    setError(null)
    try {
      const { translatedText } = await api.translate(sourceText, sourceLang, targetLang)
      setTranslatedText(translatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  function handleSwap() {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1>번역</h1>
      </div>
      <form className="translate-form" onSubmit={handleTranslate}>
        <div className="translate-lang-row">
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost" onClick={handleSwap} aria-label="언어 바꾸기">
            ⇄
          </button>
          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="translate-panels">
          <div className="translate-panel">
            <textarea
              className="translate-textarea"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="번역할 텍스트를 입력하세요"
              rows={8}
            />
            <span className={overLimit ? 'form-error' : 'status-text'}>{textBytes} / {MAX_BYTES} bytes</span>
          </div>
          <div className="translate-panel">
            <textarea className="translate-textarea" value={translatedText} readOnly rows={8} placeholder="번역 결과" />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {overLimit && <p className="form-error">텍스트가 너무 깁니다. 조금 줄여주세요.</p>}

        <button type="submit" className="btn btn-primary" disabled={loading || !sourceText.trim() || overLimit}>
          {loading ? '번역 중...' : '번역'}
        </button>
      </form>
    </section>
  )
}
