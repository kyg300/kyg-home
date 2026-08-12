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

export interface Post {
  id: string
  title: string
  content: string
  user_id: string
  author_username: string
  created_at: string
  updated_at: string
}

export const api = {
  signup: (email: string, username: string, password: string) =>
    request<{ user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User | null }>('/auth/me'),
  listPosts: () => request<{ posts: Post[] }>('/posts'),
  getPost: (id: string) => request<{ post: Post }>(`/posts/${id}`),
  createPost: (title: string, content: string) =>
    request<{ post: Post }>('/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),
  updatePost: (id: string, title: string, content: string) =>
    request<{ post: Post }>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content }),
    }),
  deletePost: (id: string) => request<{ ok: true }>(`/posts/${id}`, { method: 'DELETE' }),
}
