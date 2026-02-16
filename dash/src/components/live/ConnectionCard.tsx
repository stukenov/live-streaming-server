import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Signal, Database, Clock, Download, Upload } from 'lucide-react'
import { PreviewDialog } from './PreviewDialog'
import type { MediaPath } from '@/lib/utils'

interface ConnectionCardProps {
  connection: MediaPath
  formatBytes: (bytes: number | null) => string
  formatDate: (date: string | null) => string
}

export function ConnectionCard({ connection: conn, formatBytes, formatDate }: ConnectionCardProps) {
  return (
    <Card 
      key={conn.name} 
      className={`border-l-4 ${conn.ready ? 'border-l-green-500' : 'border-l-red-500'}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Signal className={conn.ready ? 'text-green-500' : 'text-red-500'} />
            <h3 className="text-lg font-semibold">{conn.name || 'Без названия'}</h3>
            <Badge variant={conn.ready ? "default" : "destructive"}>
              {conn.ready ? 'Активен' : 'Не активен'}
            </Badge>
          </div>
          
          <PreviewDialog name={conn.name} ready={conn.ready} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span className="text-slate-600">Тип:</span>
            <span className="font-medium">{conn.source?.type === 'rtmpConn' ? 'RTMP' : 'Неизвестно'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-slate-600">Начало:</span>
            <span className="font-medium">{formatDate(conn.readyTime)}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" />
              <span className="font-medium">{formatBytes(conn.bytesReceived)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{formatBytes(conn.bytesSent)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 