"use client"

import { useState } from "react"
import { EventCard } from "../../components/features/event/EventCard"
import { EventFilters } from "../../components/features/event/EventFilter"
import { Calendar, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const events = [
  {
    id: 1,
    title: "FPT Tech Talk: AI & Machine Learning",
    date: "2025-01-20",
    time: "14:00 - 16:00",
    location: "Hội trường A, Tòa nhà Alpha",
    category: "Workshop",
    attendees: 120,
    maxAttendees: 150,
    image: "/ai-conference.png",
    description: "Tham gia workshop về AI và Machine Learning với các chuyên gia hàng đầu từ FPT Software.",
    organizer: "FPT AI Club",
    status: "upcoming",
  },
  {
    id: 2,
    title: "Hackathon 2025: Code for Future",
    date: "2025-01-25",
    time: "08:00 - 20:00",
    location: "Khu thực hành B",
    category: "Competition",
    attendees: 85,
    maxAttendees: 100,
    image: "/hackathon-coding-competition.jpg",
    description: "24 giờ coding marathon với giải thưởng hấp dẫn lên đến 50 triệu đồng.",
    organizer: "FPT Developer Club",
    status: "upcoming",
  },
  {
    id: 3,
    title: "Soft Skills: Leadership & Communication",
    date: "2025-01-22",
    time: "18:00 - 20:00",
    location: "Phòng 301, Tòa nhà Beta",
    category: "Seminar",
    attendees: 60,
    maxAttendees: 80,
    image: "/leadership-training-seminar.png",
    description: "Phát triển kỹ năng lãnh đạo và giao tiếp hiệu quả cho sinh viên.",
    organizer: "FPT Soft Skills Club",
    status: "upcoming",
  },
  {
    id: 4,
    title: "FPT Music Night: Đêm nhạc sinh viên",
    date: "2025-01-28",
    time: "19:00 - 22:00",
    location: "Sân khấu ngoài trời",
    category: "Entertainment",
    attendees: 200,
    maxAttendees: 300,
    image: "/music-concert-night-students.jpg",
    description: "Đêm nhạc sôi động với các ban nhạc sinh viên và nghệ sĩ khách mời.",
    organizer: "FPT Music Club",
    status: "upcoming",
  },
  {
    id: 5,
    title: "Career Fair 2025",
    date: "2025-02-01",
    time: "09:00 - 17:00",
    location: "Hội trường chính",
    category: "Career",
    attendees: 150,
    maxAttendees: 500,
    image: "/career-fair-job-recruitment.jpg",
    description: "Ngày hội việc làm với hơn 50 doanh nghiệp hàng đầu tham gia tuyển dụng.",
    organizer: "FPT Career Center",
    status: "upcoming",
  },
  {
    id: 6,
    title: "Web Development Bootcamp",
    date: "2025-02-05",
    time: "13:00 - 17:00",
    location: "Lab 402",
    category: "Workshop",
    attendees: 45,
    maxAttendees: 50,
    image: "/web-dev-bootcamp.png",
    description: "Học React, Next.js và các công nghệ web hiện đại từ cơ bản đến nâng cao.",
    organizer: "FPT Web Dev Club",
    status: "upcoming",
  },
]

export function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory
    const matchesStatus = selectedStatus === "all" || event.status === selectedStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

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
                <h1 className="text-xl font-bold text-foreground">FPT Club Management</h1>
                <p className="text-sm text-muted-foreground">Quản lý câu lạc bộ sinh viên</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Trang chủ
              </a>
              <a href="#" className="text-sm font-medium text-primary">
                Sự kiện
              </a>
              <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Câu lạc bộ
              </a>
              <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Liên hệ
              </a>
            </nav>
            <Button className="hidden md:flex">Đăng nhập</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-accent/20 to-background border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Calendar className="w-4 h-4" />
              <span>Sự kiện sắp diễn ra</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Khám phá các sự kiện tại FPT University
            </h1>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              Tham gia các hoạt động, workshop, và sự kiện thú vị được tổ chức bởi các câu lạc bộ sinh viên FPT
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm sự kiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base bg-card border-border shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <EventFilters
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            onCategoryChange={setSelectedCategory}
            onStatusChange={setSelectedStatus}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Tất cả sự kiện</h2>
            <p className="text-muted-foreground mt-1">Tìm thấy {filteredEvents.length} sự kiện</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Không tìm thấy sự kiện</h3>
            <p className="text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}
      </div>
    </div>
  )
}
