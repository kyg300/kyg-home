import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'

const CITIES: Record<string, { name: string; lat: number; lon: number }> = {
  seoul: { name: '서울', lat: 37.5665, lon: 126.978 },
  incheon: { name: '인천', lat: 37.4563, lon: 126.7052 },
  suwon: { name: '수원', lat: 37.2636, lon: 127.0286 },
  chuncheon: { name: '춘천', lat: 37.8813, lon: 127.7298 },
  gangneung: { name: '강릉', lat: 37.7519, lon: 128.8761 },
  cheongju: { name: '청주', lat: 36.6424, lon: 127.489 },
  daejeon: { name: '대전', lat: 36.3504, lon: 127.3845 },
  sejong: { name: '세종', lat: 36.48, lon: 127.289 },
  jeonju: { name: '전주', lat: 35.8242, lon: 127.148 },
  gwangju: { name: '광주', lat: 35.1595, lon: 126.8526 },
  daegu: { name: '대구', lat: 35.8714, lon: 128.6014 },
  pohang: { name: '포항', lat: 36.019, lon: 129.3435 },
  ulsan: { name: '울산', lat: 35.5384, lon: 129.3114 },
  busan: { name: '부산', lat: 35.1796, lon: 129.0756 },
  changwon: { name: '창원', lat: 35.2281, lon: 128.6811 },
  jeju: { name: '제주', lat: 33.4996, lon: 126.5312 },
}

const DEFAULT_CITY = 'seoul'

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
  56: { text: '어는 이슬비', icon: '🌦️' },
  57: { text: '어는 이슬비', icon: '🌦️' },
  61: { text: '비', icon: '🌧️' },
  63: { text: '비', icon: '🌧️' },
  65: { text: '강한 비', icon: '🌧️' },
  66: { text: '어는 비', icon: '🌧️' },
  67: { text: '어는 비', icon: '🌧️' },
  71: { text: '눈', icon: '🌨️' },
  73: { text: '눈', icon: '🌨️' },
  75: { text: '강한 눈', icon: '🌨️' },
  77: { text: '싸락눈', icon: '🌨️' },
  80: { text: '소나기', icon: '🌦️' },
  81: { text: '소나기', icon: '🌦️' },
  82: { text: '강한 소나기', icon: '🌧️' },
  85: { text: '눈 소나기', icon: '🌨️' },
  86: { text: '눈 소나기', icon: '🌨️' },
  95: { text: '뇌우', icon: '⛈️' },
  96: { text: '뇌우(우박)', icon: '⛈️' },
  99: { text: '뇌우(우박)', icon: '⛈️' },
}

function describe(code: number) {
  return WEATHER_CODE_MAP[code] ?? { text: '알 수 없음', icon: '❓' }
}

// 환경부 미세먼지 예보 등급 기준 (μg/m³)
function pmGrade(value: number | null, thresholds: [number, number, number]) {
  if (value === null || Number.isNaN(value)) return null
  if (value <= thresholds[0]) return '좋음'
  if (value <= thresholds[1]) return '보통'
  if (value <= thresholds[2]) return '나쁨'
  return '매우나쁨'
}

interface OpenMeteoForecast {
  current: {
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    weather_code: number
    wind_speed_10m: number
    is_day: 0 | 1
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    precipitation_probability: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    sunrise: string[]
    sunset: string[]
  }
}

interface OpenMeteoAir {
  current: { pm10: number | null; pm2_5: number | null }
}

function queryString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  const requested = queryString(req.query.city)
  const cityKey = requested && requested in CITIES ? requested : DEFAULT_CITY
  const city = CITIES[cityKey]

  const forecastParams = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'Asia/Seoul',
    forecast_days: '7',
    forecast_hours: '24',
  })
  const airParams = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current: 'pm10,pm2_5',
    timezone: 'Asia/Seoul',
  })

  const [forecastResult, airResult] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`).then(async (r) => {
      if (!r.ok) throw new Error('forecast')
      return (await r.json()) as OpenMeteoForecast
    }),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams.toString()}`).then(async (r) => {
      if (!r.ok) throw new Error('air')
      return (await r.json()) as OpenMeteoAir
    }),
  ])

  if (forecastResult.status !== 'fulfilled') {
    return res.status(502).json({ error: '날씨 정보를 불러오지 못했습니다' })
  }

  const data = forecastResult.value
  const current = describe(data.current.weather_code)
  const pm10 = airResult.status === 'fulfilled' ? airResult.value.current.pm10 : null
  const pm25 = airResult.status === 'fulfilled' ? airResult.value.current.pm2_5 : null

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
  return res.status(200).json({
    city: cityKey,
    location: city.name,
    cities: Object.entries(CITIES).map(([key, c]) => ({ key, name: c.name })),
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windspeed: data.current.wind_speed_10m,
    isDay: data.current.is_day === 1,
    condition: current.text,
    icon: current.icon,
    todayMax: data.daily.temperature_2m_max[0],
    todayMin: data.daily.temperature_2m_min[0],
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
    air: {
      pm10,
      pm25,
      pm10Grade: pmGrade(pm10, [30, 80, 150]),
      pm25Grade: pmGrade(pm25, [15, 35, 75]),
    },
    hourly: data.hourly.time.map((time, i) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      icon: describe(data.hourly.weather_code[i]).icon,
      precipitationProbability: data.hourly.precipitation_probability[i],
    })),
    daily: data.daily.time.map((date, i) => {
      const d = describe(data.daily.weather_code[i])
      return {
        date,
        condition: d.text,
        icon: d.icon,
        max: data.daily.temperature_2m_max[i],
        min: data.daily.temperature_2m_min[i],
        precipitationProbability: data.daily.precipitation_probability_max[i],
      }
    }),
  })
}
