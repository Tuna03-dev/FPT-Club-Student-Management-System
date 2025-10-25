"use client"

import { useState, useEffect } from "react"
import { Calendar, Tag, Facebook, Phone } from "lucide-react"
import { Link } from "react-router-dom"
import { getNewsById, type NewsData } from "@/service/NewsService"

interface NewsDetailProps {
  newsId: string
}

export function NewsDetail({ newsId }: NewsDetailProps) {
  const [news, setNews] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        setError("")
        const newsData = await getNewsById(Number(newsId))
        setNews(newsData)
      } catch (e) {
        console.error("Error fetching news:", e)
        setError("Không thể tải thông tin tin tức")
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [newsId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Không tìm thấy tin tức"}</p>
          <Link to="/news" className="text-primary hover:underline">
            Quay lại danh sách tin tức
          </Link>
        </div>
      </div>
    )
  }

  const updatedDate = new Date(news.updatedAt)
  const formattedDate = updatedDate.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
  const formattedTime = updatedDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  })
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Featured image */}
        <div className="relative w-full h-96 rounded-xl overflow-hidden mb-8 shadow-lg">
          <img
            src={news.thumbnailUrl || "/placeholder.svg"}
            alt={news.title}
            className="w-full h-full object-cover"
          />
          
          {news.clubName && (
            <div className="absolute top-4 left-4">
              <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                {news.clubName}
              </span>
            </div>
          )}
          {news.newsType && (
            <div className="absolute top-4 right-4">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                {news.newsType}
              </span>
            </div>
          )}
        </div>

        {/* Article metadata */}
        <div className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Cập nhật: {formattedDate} lúc {formattedTime}</span>
          </div>
          {news.clubName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="w-4 h-4" />
              <span className="text-sm">{news.clubName}</span>
            </div>
          )}
        </div>

        {/* Article title */}
        <h1 className="text-4xl font-bold text-foreground mb-6 leading-tight">{news.title}</h1>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
            <Phone className="w-4 h-4" />
            <span>Liên hệ</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
            <Facebook className="w-4 h-4" />
            <span>Chia sẻ Facebook</span>
          </button>
        </div>

        {/* Article content */}
        <div className="prose prose-lg max-w-none">
          <div className="text-lg text-foreground leading-relaxed space-y-6">
            <p className="text-base text-foreground/90 whitespace-pre-line">
              {news.content}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
