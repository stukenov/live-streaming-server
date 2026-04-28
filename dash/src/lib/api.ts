import { MediaListResponse } from './utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function getMediaConnections(): Promise<MediaListResponse> {
  return fetchAPI<MediaListResponse>('/media/paths')
}

export async function getMediaList(): Promise<MediaListResponse> {
  return fetchAPI<MediaListResponse>('/media/list')
}

export async function getStreamDetails(name: string) {
  return fetchAPI(`/media/stream/${encodeURIComponent(name)}`)
}

export async function deleteStream(name: string) {
  return fetchAPI(`/media/stream/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}
