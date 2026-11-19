import { upload } from '@vercel/blob/client'

const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error ?? `요청이 실패했습니다 (${res.status})`)
  }
  return data as T
}

export interface User {
  id: string
  email: string
  username: string
}

export interface Attachment {
  id: string
  filename: string
  content_type: string
  size: number
  created_at: string
}

export interface Post {
  id: string
  title: string
  content: string
  user_id: string
  author_username: string
  created_at: string
  updated_at: string
  attachments?: Attachment[]
}

export interface NewAttachment {
  url: string
  filename: string
  contentType: string
  size: number
}

export interface KeptAttachment {
  id: string
}

export type AttachmentPayload = NewAttachment | KeptAttachment

export interface Article {
  title: string
  link: string
  pubDate: string
  source: string
}

export interface Stock {
  code: string
  name: string
  price: string
  change: string
  changeDirection: string
  changeRate: string
  open: string
  high: string
  low: string
  volume: string
  marketStatus: string
  tradedAt: string
}

export interface Exchange {
  code: string
  name: string
  price: string
  change: string
  changeDirection: string
  changeRate: string
  tradedAt: string
}

export interface Coin {
  code: string
  name: string
  price: string
  change: string
  changeDirection: string
  changeRate: string
}

export interface WatchlistItem {
  code: string
  name: string
}

export interface StockSearchResult {
  code: string
  name: string
  market: string
}

export interface WeatherHour {
  time: string
  temperature: number
  icon: string
  precipitationProbability: number
}

export interface WeatherDay {
  date: string
  condition: string
  icon: string
  max: number
  min: number
  precipitationProbability: number
}

export type AirGrade = '좋음' | '보통' | '나쁨' | '매우나쁨'

export interface Weather {
  city: string
  location: string
  cities: { key: string; name: string }[]
  temperature: number
  feelsLike: number
  humidity: number
  windspeed: number
  isDay: boolean
  condition: string
  icon: string
  todayMax: number
  todayMin: number
  sunrise: string
  sunset: string
  air: {
    pm10: number | null
    pm25: number | null
    pm10Grade: AirGrade | null
    pm25Grade: AirGrade | null
  }
  hourly: WeatherHour[]
  daily: WeatherDay[]
}

export interface Todo {
  id: string
  text: string
  done: boolean
  created_at: string
}

export interface Memo {
  id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Dday {
  id: string
  title: string
  target_date: string
  created_at: string
}

export interface TrendItem {
  rank: number
  keyword: string
  traffic: string
  newsTitle: string
  newsLink: string
  newsSource: string
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User | null }>('/auth/me'),
  listPosts: () => request<{ posts: Post[] }>('/posts'),
  getPost: (id: string) => request<{ post: Post }>(`/posts/${id}`),
  createPost: (title: string, content: string, attachments: NewAttachment[] = []) =>
    request<{ post: Post }>('/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content, attachments }),
    }),
  updatePost: (id: string, title: string, content: string, attachments: AttachmentPayload[] = []) =>
    request<{ post: Post }>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, attachments }),
    }),
  deletePost: (id: string) => request<{ ok: true }>(`/posts/${id}`, { method: 'DELETE' }),
  getStocks: () =>
    request<{ stocks: Stock[]; exchanges: Exchange[]; coins: Coin[]; watchlist: WatchlistItem[] }>('/stocks'),
  searchStocks: (q: string) =>
    request<{ results: StockSearchResult[] }>(`/stocks?${new URLSearchParams({ q }).toString()}`),
  addWatchlist: (code: string, name: string) =>
    request<{ ok: true }>('/stocks', { method: 'POST', body: JSON.stringify({ code, name }) }),
  removeWatchlist: (code: string) =>
    request<{ ok: true }>(`/stocks?${new URLSearchParams({ code }).toString()}`, { method: 'DELETE' }),
  getWeather: (city?: string) =>
    request<Weather>(city ? `/weather?${new URLSearchParams({ city }).toString()}` : '/weather'),
  listTodos: () => request<{ items: Todo[] }>('/personal?kind=todos'),
  createTodo: (text: string) =>
    request<{ item: Todo }>('/personal?kind=todos', { method: 'POST', body: JSON.stringify({ text }) }),
  updateTodo: (id: string, changes: { text?: string; done?: boolean }) =>
    request<{ item: Todo }>(`/personal?kind=todos&id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    }),
  deleteTodo: (id: string) =>
    request<{ ok: true }>(`/personal?kind=todos&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listMemos: () => request<{ items: Memo[] }>('/personal?kind=memos'),
  createMemo: (content: string) =>
    request<{ item: Memo }>('/personal?kind=memos', { method: 'POST', body: JSON.stringify({ content }) }),
  updateMemo: (id: string, content: string) =>
    request<{ item: Memo }>(`/personal?kind=memos&id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  deleteMemo: (id: string) =>
    request<{ ok: true }>(`/personal?kind=memos&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listDdays: () => request<{ items: Dday[] }>('/personal?kind=ddays'),
  createDday: (title: string, targetDate: string) =>
    request<{ item: Dday }>('/personal?kind=ddays', {
      method: 'POST',
      body: JSON.stringify({ title, targetDate }),
    }),
  deleteDday: (id: string) =>
    request<{ ok: true }>(`/personal?kind=ddays&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  translate: (text: string, source: string, target: string) =>
    request<{ translatedText: string }>(
      `/translate?${new URLSearchParams({ text, source, target }).toString()}`,
    ),
  getNews: () => request<{ articles: Article[] }>('/news'),
  getTrends: () => request<{ trends: TrendItem[] }>('/trends'),
  uploadAttachment: async (file: File): Promise<NewAttachment> => {
    const blob = await upload(file.name, file, {
      access: 'private',
      handleUploadUrl: '/api/blob/upload',
    })
    return { url: blob.url, filename: file.name, contentType: file.type, size: file.size }
  },
}
