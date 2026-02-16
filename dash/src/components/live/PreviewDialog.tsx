import { Button } from "@/components/ui/button"
import { ExternalLink, Play } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

interface PreviewDialogProps {
  name: string
  ready: boolean
}

export function PreviewDialog({ name, ready }: PreviewDialogProps) {
  const openInNewWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          disabled={!ready}
        >
          <Play className="h-4 w-4 mr-2" />
          Предпросмотр
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Предпросмотр: {name || 'Без названия'}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video rounded overflow-hidden">
          <iframe 
            src="http://localhost:8888/live/"
            className="w-full h-full"
            allow="autoplay; fullscreen"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => openInNewWindow('http://localhost:8888/live/')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            В новом окне
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 