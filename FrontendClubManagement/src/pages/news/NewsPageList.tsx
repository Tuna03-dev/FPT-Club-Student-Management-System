import { useState, useEffect } from "react"
import { Search, Calendar, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import { NewsFilters } from "@/components/features/news/NewsFilter"
import { NewsCardSkeleton } from "@/components/features/news/NewsCardSkeleton"
import { getAllNewsByFilter, getAllClubs, type NewsData, type ClubDto } from "@/service/NewsService"

export default function NewsPageList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClubId, setSelectedClubId] = useState<string>("all")
  const [clubs, setClubs] = useState<ClubDto[]>([])
  const [news, setNews] = useState<NewsData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch clubs once
  useEffect(() => {
    let mounted = true
    
    const fetchClubs = async () => {
      try {
        const clubsData = await getAllClubs()
        if (mounted) setClubs(clubsData)
      } catch (error) {
        console.error("Error fetching clubs:", error)
      }
    }
    
    fetchClubs()
    return () => {
      mounted = false
    }
  }, [])

  // Fetch news when search query, club, or page changes
  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    const fetchData = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await getAllNewsByFilter({
          keyword: searchQuery || undefined,
          clubId: selectedClubId !== "all" ? Number(selectedClubId) : undefined,
          page: currentPage,
          size: 12,
        })
        if (mounted) {
          setNews(res.data)
          setTotalPages(Math.ceil(res.total / 12))
        }
      } catch (e) {
        console.error("Error fetching news:", e)
        if (mounted) setError("Không thể tải danh sách tin tức")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    const debounce = setTimeout(fetchData, 300)
    return () => {
      mounted = false
      controller.abort()
      clearTimeout(debounce)
    }
  }, [searchQuery, selectedClubId, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedClubId])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">Tin tức & Sự kiện</Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Cập nhật tin tức mới nhất
            </h1>
            <p className="text-base md:text-lg text-muted-foreground text-pretty">
              Khám phá các hoạt động, sự kiện và thông báo từ các câu lạc bộ tại FPT University
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="py-4 border-b border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm tin tức..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 bg-background"
                  />
                </div>
              </div>
              
              {/* Club Filter */}
              <div className="w-full sm:w-auto">
                <NewsFilters
                  clubs={clubs}
                  selectedClubId={selectedClubId}
                  onClubChange={setSelectedClubId}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-6 md:py-8">
        <div className="container mx-auto px-4">
          {/* News Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Tất cả tin tức</h2>
            <p className="text-muted-foreground">
              {loading ? "Đang tải..." : `Trang ${currentPage} - Hiển thị ${news.length} tin tức`}
            </p>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }, (_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-destructive text-lg mb-4">{error}</p>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">Không tìm thấy tin tức phù hợp</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((newsItem) => {
                const updatedDate = new Date(newsItem.updatedAt)
                const formattedDate = updatedDate.toLocaleDateString("vi-VN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })
                
                return (
                  <Card
                    key={newsItem.id}
                    className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50"
                  >
                    <div className="relative overflow-hidden aspect-video">
                      <img
                        src={newsItem.thumbnailUrl || "/placeholder.svg"}
                        alt={newsItem.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {newsItem.clubName && (
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="bg-muted/80 text-foreground border-border">
                            {newsItem.clubName}
                          </Badge>
                        </div>
                      )}
                      {newsItem.newsType && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                            {newsItem.newsType}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="h-4 w-4" />
                        <span>{formattedDate}</span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors text-balance">
                        {newsItem.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2 text-pretty leading-relaxed">
                        {newsItem.content}
                      </p>
                      <div className="flex items-center justify-end">
                        <Link to={`/news/${newsItem.id}`}>
                          <Button variant="ghost" size="sm" className="group/btn">
                            Xem chi tiết
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center mt-12">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10 h-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
