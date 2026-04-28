import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface MediaSource {
  type: string
  id: string
}

export interface MediaReader {
  type: string
  id: string
}

export interface MediaPath {
  name: string
  confName: string
  source: MediaSource | null
  ready: boolean
  readyTime: string | null
  tracks: string[]
  bytesReceived: number | null
  bytesSent: number | null
  readers: MediaReader[]
}

export interface MediaListResponse {
  itemCount: number
  pageCount: number
  items: MediaPath[]
}
