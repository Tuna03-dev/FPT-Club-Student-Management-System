"use client"

import { useState } from "react"
import { Search, Calendar, Tag, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface NewsItem {
  id: number
  title: string
  excerpt: string
  date: string
  type: string
  image: string
  author: string
}

const newsData: NewsItem[] = [
  {
    id: 1,
    title: "FPT Club tổ chức Hackathon 2024 - Cuộc thi lập trình lớn nhất năm",
    excerpt: "Sự kiện Hackathon 2024 sẽ diễn ra vào tháng 11 với nhiều giải thưởng hấp dẫn dành cho sinh viên FPT.",
    date: "15 Tháng 10, 2024",
    type: "Sự kiện",
    image: "/hackathon-coding-competition.jpg",
    author: "Ban Tổ Chức",
  },
  {
    id: 2,
    title: "Workshop: Khám phá AI và Machine Learning cho người mới bắt đầu",
    excerpt: "Tham gia workshop miễn phí về AI và ML với các chuyên gia hàng đầu trong ngành.",
    date: "12 Tháng 10, 2024",
    type: "Workshop",
    image: "/ai-machine-learning-workshop.jpg",
    author: "CLB Công Nghệ",
  },
  {
    id: 3,
    title: "Thông báo tuyển thành viên mới cho CLB Lập Trình FPT",
    excerpt: "CLB Lập Trình FPT đang tìm kiếm những thành viên nhiệt huyết và đam mê công nghệ.",
    date: "10 Tháng 10, 2024",
    type: "Thông báo",
    image: "/recruitment-team-technology.jpg",
    author: "Ban Quản Trị",
  },
  {
    id: 4,
    title: "Chuyến tham quan công ty công nghệ hàng đầu Việt Nam",
    excerpt: "Cơ hội tuyệt vời để các bạn sinh viên được trải nghiệm môi trường làm việc thực tế.",
    date: "8 Tháng 10, 2024",
    type: "Hoạt động",
    image: "/tech-company-office-visit.jpg",
    author: "CLB Nghề Nghiệp",
  },
  {
    id: 5,
    title: "Kết quả cuộc thi Code Challenge tháng 9",
    excerpt: "Xin chúc mừng các bạn đã đạt giải trong cuộc thi Code Challenge tháng 9 vừa qua.",
    date: "5 Tháng 10, 2024",
    type: "Thông báo",
    image: "/coding-competition-winners.png",
    author: "Ban Giám Khảo",
  },
  {
    id: 6,
    title: "Seminar: Xu hướng công nghệ 2024 và cơ hội nghề nghiệp",
    excerpt: "Tìm hiểu về các xu hướng công nghệ mới nhất và định hướng nghề nghiệp cho sinh viên IT.",
    date: "1 Tháng 10, 2024",
    type: "Seminar",
    image: "/technology-trends-seminar.jpg",
    author: "Diễn Giả Khách Mời",
  },
]

export default function NewsPageList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")

  const filteredNews = newsData.filter((news) => {
    const matchesSearch =
      news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      news.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === "all" || news.type === selectedType
    return matchesSearch && matchesType
  })

  const newsTypes = ["all", ...Array.from(new Set(newsData.map((news) => news.type)))]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">FPT</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">FPT Club</h1>
                <p className="text-xs text-muted-foreground">Quản lý câu lạc bộ</p>
              </div>
            </div>
            <Button variant="outline" className="hidden md:flex bg-transparent">
              Đăng nhập
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">Tin tức & Sự kiện</Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Cập nhật tin tức mới nhất
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty">
              Khám phá các hoạt động, sự kiện và thông báo từ các câu lạc bộ tại FPT University
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 border-b border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm tin tức..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-background"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-[200px] h-12 bg-background">
                  <Tag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Loại tin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {newsTypes.slice(1).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {filteredNews.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">Không tìm thấy tin tức phù hợp</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNews.map((news) => (
                <Card
                  key={news.id}
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50"
                >
                  <div className="relative overflow-hidden aspect-video">
                    <img
                      src={news.image || "/placeholder.svg"}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-primary-foreground">{news.type}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="h-4 w-4" />
                      <span>{news.date}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors text-balance">
                      {news.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2 text-pretty leading-relaxed">
                      {news.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{news.author}</span>
                      <Button variant="ghost" size="sm" className="group/btn">
                        Xem thêm
                        <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">© 2025 FPT University Club Management. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
