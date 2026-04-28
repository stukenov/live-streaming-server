'use client'

import { useState, useEffect } from 'react'
import { getMediaConnections } from '@/lib/api'
import { MediaPath } from '@/lib/utils'
import { Card } from "@/components/ui/card"
import { AlertCircle, Database, RefreshCcw } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConnectionCard } from '@/components/live/ConnectionCard'
import { InfoCard } from '@/components/live/InfoCard'

export default function Home() {
  const [error, setError] = useState('')
  const [mediaConnections, setMediaConnections] = useState<MediaPath[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadMediaConnections()
    const interval = setInterval(loadMediaConnections, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadMediaConnections = async () => {
    try {
      setIsRefreshing(true)
      const data = await getMediaConnections()
      
      // Compare and update only changed items
      setMediaConnections(prevConnections => {
        if (!prevConnections.length) return data.items
        
        return data.items.map(newConn => {
          const oldConn = prevConnections.find(p => p.name === newConn.name)
          if (!oldConn) return newConn
          
          // Only update if something changed
          if (JSON.stringify(oldConn) !== JSON.stringify(newConn)) {
            return newConn
          }
          return oldConn
        })
      })
      
      setError('')
    } catch (error) {
      setError('Failed to load media connections')
      console.error('Failed to load media connections:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <TooltipProvider>
      <main className="p-6 max-w-full">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="flex items-center gap-4 text-base">
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMediaConnections}
                className="ml-auto hover:bg-red-50"
                disabled={isRefreshing}
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Retry'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-blue-600">Live Streams</h2>
            <p className="text-slate-600 text-sm">Monitor and manage active broadcasts</p>
          </div>
          <div className="flex items-center gap-4">
          </div>
        </div>

        <InfoCard />

        <div className="grid gap-4">
          {mediaConnections.map((conn) => (
            <ConnectionCard 
              key={conn.name} 
              connection={conn}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          ))}

          {mediaConnections.length === 0 && !error && (
            <Card className="p-8 text-center border-dashed">
              <Database className="h-12 w-12 mx-auto mb-4 text-slate-200" />
              <h3 className="text-xl font-semibold mb-2">No active connections</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Start streaming by connecting a source via OBS Studio, FFmpeg, or any RTMP-compatible software
              </p>
            </Card>
          )}
        </div>
      </main>
    </TooltipProvider>
  )
}
