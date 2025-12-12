import { useParams } from "react-router-dom"
import { NewsDetail } from "@/components/news/NewsDetail"

export default function NewsPageDetail() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Không tìm thấy ID tin tức</p>
        </div>
      </div>
    )
  }

  return <NewsDetail newsId={id} />
}