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
  const hlsBaseUrl = process.env.NEXT_PUBLIC_HLS_URL || 'http://localhost:8888'
  const streamUrl = `${hlsBaseUrl}/${name}/`

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
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview: {name || 'Untitled'}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video rounded overflow-hidden">
          <iframe
            src={streamUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => openInNewWindow(streamUrl)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new window
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 