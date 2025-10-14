import React, { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { getHomepageData } from "../api/homepageApi"
import type { HomepageData } from "../types/homepage"
import SpotlightSection from "../components/homepage/Spotlight"
import UpcomingEvents from "../components/homepage/UpcomingEvents"
import FeaturedClubs from "../components/homepage/FeaturedClubs"
import LatestNews from "../components/homepage/LatestNews"



const HomePage: React.FC = () => {
  const [data, setData] = useState<HomepageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const homepageData = await getHomepageData()
        setData(homepageData)
      } catch (err) {
        setError("Không thể tải dữ liệu trang chủ")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">{error || "Đã xảy ra lỗi"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="text-white py-20 md:py-32 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070')",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide">Hơn 50+ Câu Lạc Bộ</h1>
          <h2 className="text-4xl md:text-6xl font-black uppercase text-[#ff6b35]">Một Cộng Đồng</h2>
          <p className="mt-4 text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Tìm kiếm đam mê và kết nối với bạn bè tại Đại học FPT Hà Nội.
          </p>

          {/* Thanh tìm kiếm */}
          <div className="mt-8 max-w-2xl mx-auto">
  <div className="relative flex items-center">
    <input
      type="text"
      placeholder="Tìm kiếm câu lạc bộ, sự kiện, tin tức..."
      className="w-full pl-5 pr-36 py-3 rounded-full border-2 border-transparent focus:border-[#ff6b35] focus:outline-none text-gray-800 placeholder-gray-500 text-base"
    />
    <button
      className="absolute right-2 bg-[#ff6b35] text-white px-6 py-2 rounded-full hover:bg-[#e55a2b] transition-colors flex items-center gap-2 font-semibold"
    >
      <Search className="w-5 h-5" />
      <span>Tìm kiếm</span>
    </button>
  </div>

  {/* Gợi ý */}
  <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
    <span className="font-semibold mr-2">Gợi ý:</span>
    {["Tình nguyện", "Lập trình", "Âm nhạc", "Sự kiện tháng 10"].map((tag) => (
      <a
        key={tag}
        href="#"
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
      >
        {tag}
      </a>
    ))}
  </div>
</div>

        </div>
      </section>

      {/* Nội dung chính */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <SpotlightSection spotlight={data.spotlight} />
        <section className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-12">Có Gì Hot Tuần Này?</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <UpcomingEvents events={data.upcomingEvents} />
            <LatestNews news={data.latestNews} />
          </div>
        </section>
        <FeaturedClubs clubs={data.featuredClubs} />

        {/* CTA */}
        <section className="mt-16 bg-[#ff6b35] rounded-2xl py-16 px-4 text-center text-white">
          <h2 className="text-3xl font-bold">Sẵn sàng để tham gia?</h2>
          <p className="mt-2 text-lg opacity-90">
            Trở thành một phần của cộng đồng sinh viên FPT năng động ngay hôm nay.
          </p>
          <a
            href="/clubs"
            className="inline-block mt-6 bg-white text-[#ff6b35] px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-bold"
          >
            Xem Danh Sách Câu Lạc Bộ
          </a>
        </section>
      </div>
    </div>
  )
}

export default HomePage
