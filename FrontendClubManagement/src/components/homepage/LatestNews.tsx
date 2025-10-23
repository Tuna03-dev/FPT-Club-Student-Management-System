import React from "react"
import { Flame } from "lucide-react"
import type { LatestNews as LatestNewsType } from "../../types/homepage" // đổi tên type

interface Props {
  news: LatestNewsType[]  // dùng LatestNewsType thay cho LatestNews
}

const LatestNews: React.FC<Props> = ({ news }) => {
  return (
    <div>
      <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
        <Flame className="text-[#ff6b35]" />
        Tin Tức Nóng
      </h3>
      <div className="space-y-6">
        {news.slice(0, 2).map((item) => (
          <a key={item.id} href={`/news/${item.id}`} className="flex gap-4 group">
            <img
              src={item.thumbnailUrl || "/placeholder.svg"}
              alt={item.title}
              className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
            />
            <div>
              <h4 className="font-bold group-hover:text-[#ff6b35] transition-colors line-clamp-2">
                {item.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-3">{item.excerpt}</p>
            </div>
          </a>
        ))}
      </div>
      <a href="/news" className="inline-block mt-8 text-[#ff6b35] hover:underline font-medium">
        Xem tất cả tin tức →
      </a>
    </div>
  )
}

export default LatestNews
