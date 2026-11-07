import { useEffect, useState } from 'react'
import { getDailyFortune, todayKey, ZODIACS } from '../lib/fortune'

const STORAGE_KEY = 'kyg_home_zodiac'

export default function FortunePage() {
  const [zodiacKey, setZodiacKey] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && ZODIACS.some((z) => z.key === saved)) setZodiacKey(saved)
    } catch {
      // localStorage unavailable, ignore
    }
  }, [])

  function selectZodiac(key: string) {
    setZodiacKey(key)
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      // localStorage unavailable, ignore
    }
  }

  const selected = ZODIACS.find((z) => z.key === zodiacKey) ?? null
  const fortune = selected ? getDailyFortune(selected.key) : null

  return (
    <section className="page">
      <div className="page-header">
        <h1>오늘의 운세</h1>
        <span className="status-text">{todayKey()}</span>
      </div>

      <div className="zodiac-grid">
        {ZODIACS.map((z) => (
          <button
            key={z.key}
            type="button"
            className={`zodiac-chip${z.key === zodiacKey ? ' zodiac-chip-active' : ''}`}
            onClick={() => selectZodiac(z.key)}
          >
            <span className="zodiac-emoji">{z.emoji}</span>
            <span>{z.name}</span>
          </button>
        ))}
      </div>

      {selected && fortune && (
        <div className="card fortune-card">
          <div className="fortune-header">
            <span className="fortune-emoji">{selected.emoji}</span>
            <h2>{selected.name} 운세</h2>
            <span className="fortune-score">운세 점수 {fortune.score}점</span>
          </div>
          <dl className="fortune-list">
            <dt>총운</dt>
            <dd>{fortune.overall}</dd>
            <dt>금전운</dt>
            <dd>{fortune.money}</dd>
            <dt>애정운</dt>
            <dd>{fortune.love}</dd>
            <dt>건강운</dt>
            <dd>{fortune.health}</dd>
          </dl>
        </div>
      )}

      {!selected && <p className="status-text">띠를 선택하면 오늘의 운세를 볼 수 있어요.</p>}
    </section>
  )
}
