import { Card, CardContent } from "@/components/ui/card"

export function InfoCard() {
  return (
    <Card className="mb-4 border-blue-100 bg-blue-50/30">
      <CardContent className="p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">RTMP URL</h4>
            <div className="p-2 bg-white rounded border border-blue-100">
              <code className="text-sm select-all">rtmp://localhost:1935/live</code>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Код для встраивания</h4>
            <div className="p-2 bg-white rounded border border-blue-100">
              <code className="text-sm select-all break-all">{'<iframe src="http://localhost:8888/live/" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>'}</code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 