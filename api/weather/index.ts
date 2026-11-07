import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'

const SEOUL_LAT = 37.5665
const SEOUL_LON = 126.978

const WEATHER_CODE_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: '맑음', icon: '☀️' },
  1: { text: '대체로 맑음', icon: '🌤️' },
  2: { text: '구름 조금', icon: '⛅' },
  3: { text: '흐림', icon: '☁️' },
  45: { text: '안개', icon: '🌫️' },
  48: { text: '안개', icon: '🌫️' },
  51: { text: '이슬비', icon: '🌦️' },
  53: { text: '이슬비', icon: '🌦️' },
  55: { text: '이슬비', icon: '🌦️' },
  61: { text: '비', icon: '🌧️' },
  63: { text: '비', icon: '🌧️' },
  65: { text: '강한 비', icon: '🌧️' },
  71: { text: '눈', icon: '🌨️' },
  73: { text: '눈', icon: '🌨️' },
  75: { text: '강한 눈', icon: '🌨️' },
  80: { text: '소나기', icon: '🌦️' },
  81: { text: '소나기', icon: '🌦️' },
  82: { text: '강한 소나기', icon: '🌧️' },
  95: { text: '뇌우', icon: '⛈️' },
  96: { text: '뇌우(우박)', icon: '⛈️' },
  99: { text: '뇌우(우박)', icon: '⛈️' },
}

interface OpenMeteoResponse {
  current_weather: {
    temperature: number
    windspeed: number
    weathercode: number
    is_day: 0 | 1
  }
  daily: {
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  const params = new URLSearchParams({
    latitude: String(SEOUL_LAT),
    longitude: String(SEOUL_LON),
    current_weather: 'true',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'Asia/Seoul',
  })
  const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
  if (!upstream.ok) {
    return res.status(502).json({ error: '날씨 정보를 불러오지 못했습니다' })
  }

  const data = (await upstream.json()) as OpenMeteoResponse
  const { temperature, windspeed, weathercode, is_day } = data.current_weather
  const condition = WEATHER_CODE_MAP[weathercode] ?? { text: '알 수 없음', icon: '❓' }

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
  return res.status(200).json({
    location: '서울',
    temperature,
    windspeed,
    isDay: is_day === 1,
    condition: condition.text,
    icon: condition.icon,
    todayMax: data.daily.temperature_2m_max[0],
    todayMin: data.daily.temperature_2m_min[0],
  })
}
