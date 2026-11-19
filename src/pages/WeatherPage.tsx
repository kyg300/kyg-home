import { useEffect, useState } from 'react'
import { api, type AirGrade, type Weather } from '../lib/api'
import { readStorage, WEATHER_CITY_KEY, writeStorage } from '../lib/storage'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function hourLabel(iso: string) {
  return `${Number(iso.slice(11, 13))}시`
}

function timeLabel(iso: string) {
  return iso.slice(11, 16)
}

function dayLabel(date: string, index: number) {
  if (index === 0) return '오늘'
  if (index === 1) return '내일'
  const [y, m, d] = date.split('-').map(Number)
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${m}/${d}`
}

function gradeClass(grade: AirGrade | null) {
  switch (grade) {
    case '좋음':
      return 'air-good'
    case '보통':
      return 'air-normal'
    case '나쁨':
      return 'air-bad'
    case '매우나쁨':
      return 'air-very-bad'
    default:
      return ''
  }
}

export default function WeatherPage() {
  const [city, setCity] = useState(() => readStorage(WEATHER_CITY_KEY) ?? 'seoul')
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getWeather(city)
      .then((data) => {
        if (cancelled) return
        setWeather(data)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '날씨 정보를 불러오지 못했습니다')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [city])

  function handleCityChange(next: string) {
    setCity(next)
    writeStorage(WEATHER_CITY_KEY, next)
  }

  // 주간 최저~최고 범위 안에서 하루 기온 막대를 위치시킨다
  const weekMin = weather ? Math.min(...weather.daily.map((d) => d.min)) : 0
  const weekMax = weather ? Math.max(...weather.daily.map((d) => d.max)) : 0
  const span = Math.max(weekMax - weekMin, 1)

  return (
    <section className="page">
      <div className="page-header">
        <h1>날씨</h1>
        <select
          className="form-input weather-city-select"
          value={weather?.city ?? city}
          onChange={(e) => handleCityChange(e.target.value)}
          aria-label="지역 선택"
        >
          {(weather?.cities ?? [{ key: city, name: '불러오는 중...' }]).map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && !weather && <p className="status-text">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}

      {weather && (
        <div className={loading ? 'weather-page is-loading' : 'weather-page'}>
          <div className="card weather-now">
            <span className="weather-now-icon">{weather.icon}</span>
            <div className="weather-now-main">
              <span className="weather-now-temp">{Math.round(weather.temperature)}°</span>
              <span className="weather-now-condition">
                {weather.location} · {weather.condition}
              </span>
              <span className="status-text">
                최고 {Math.round(weather.todayMax)}° / 최저 {Math.round(weather.todayMin)}° · 체감{' '}
                {Math.round(weather.feelsLike)}°
              </span>
            </div>
          </div>

          <dl className="weather-stats">
            <div className="card weather-stat">
              <dt>습도</dt>
              <dd>{weather.humidity}%</dd>
            </div>
            <div className="card weather-stat">
              <dt>바람</dt>
              <dd>{(weather.windspeed / 3.6).toFixed(1)} m/s</dd>
            </div>
            <div className="card weather-stat">
              <dt>미세먼지</dt>
              <dd className={gradeClass(weather.air.pm10Grade)}>
                {weather.air.pm10Grade ?? '-'}
                {weather.air.pm10 !== null && <small> {Math.round(weather.air.pm10)}㎍</small>}
              </dd>
            </div>
            <div className="card weather-stat">
              <dt>초미세먼지</dt>
              <dd className={gradeClass(weather.air.pm25Grade)}>
                {weather.air.pm25Grade ?? '-'}
                {weather.air.pm25 !== null && <small> {Math.round(weather.air.pm25)}㎍</small>}
              </dd>
            </div>
            <div className="card weather-stat">
              <dt>일출 / 일몰</dt>
              <dd>
                {timeLabel(weather.sunrise)} / {timeLabel(weather.sunset)}
              </dd>
            </div>
          </dl>

          <h2 className="section-title weather-section-title">시간별 예보</h2>
          <div className="weather-hourly" role="list">
            {weather.hourly.map((h, i) => (
              <div key={h.time} className="weather-hour" role="listitem">
                <span className="weather-hour-time">{i === 0 ? '지금' : hourLabel(h.time)}</span>
                <span className="weather-hour-icon">{h.icon}</span>
                <span className="weather-hour-temp">{Math.round(h.temperature)}°</span>
                <span className="weather-hour-rain">{h.precipitationProbability > 0 ? `💧${h.precipitationProbability}%` : ' '}</span>
              </div>
            ))}
          </div>

          <h2 className="section-title weather-section-title">주간 예보</h2>
          <ul className="weather-daily">
            {weather.daily.map((d, i) => (
              <li key={d.date} className="weather-day">
                <span className="weather-day-label">{dayLabel(d.date, i)}</span>
                <span className="weather-day-icon" title={d.condition}>
                  {d.icon}
                </span>
                <span className="weather-day-rain">{d.precipitationProbability > 0 ? `${d.precipitationProbability}%` : ''}</span>
                <span className="weather-day-min">{Math.round(d.min)}°</span>
                <span className="weather-day-bar" aria-hidden="true">
                  <span
                    className="weather-day-bar-fill"
                    style={{
                      left: `${((d.min - weekMin) / span) * 100}%`,
                      width: `${Math.max(((d.max - d.min) / span) * 100, 4)}%`,
                    }}
                  />
                </span>
                <span className="weather-day-max">{Math.round(d.max)}°</span>
              </li>
            ))}
          </ul>
          <p className="status-text weather-source">데이터: Open-Meteo</p>
        </div>
      )}
    </section>
  )
}
