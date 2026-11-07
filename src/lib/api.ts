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

export interface Weather {
  location: string
  temperature: number
  windspeed: number
  isDay: boolean
  condition: string
  icon: string
  todayMax: number
  todayMin: number
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
  getStocks: () => request<{ stocks: Stock[]; exchanges: Exchange[]; coins: Coin[] }>('/stocks'),
  getWeather: () => request<Weather>('/weather'),
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
