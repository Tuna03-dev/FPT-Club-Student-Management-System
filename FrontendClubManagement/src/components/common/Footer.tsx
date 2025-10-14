import type React from "react"
import { Link } from "react-router-dom"

const Footer: React.FC = () => {
  return (
    <footer className="bg-orange-600 text-white mt-16">
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-lg mb-2">Tổ chức Giáo dục FPT</h4>
            <p className="text-sm text-orange-100/90">
              Hệ thống giáo dục hàng đầu Việt Nam — thông tin, hoạt động câu lạc bộ và sự kiện.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Liên kết</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:underline">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/clubs" className="hover:underline">
                  Câu lạc bộ
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:underline">
                  Sự kiện
                </Link>
              </li>
              <li>
                <Link to="/news" className="hover:underline">
                  Tin tức
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Liên hệ</h4>
            <p className="text-sm">Email: contact@fpt.edu.vn</p>
            <p className="text-sm">Hotline: 024 7300 1866</p>
            <div className="flex items-center gap-3 mt-3">
              <a className="text-white/90 hover:text-white" href="#" aria-label="facebook">
                Facebook
              </a>
              <a className="text-white/90 hover:text-white" href="#" aria-label="instagram">
                Instagram
              </a>
              <a className="text-white/90 hover:text-white" href="#" aria-label="youtube">
                YouTube
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-orange-500/30 pt-6 text-sm text-orange-100/80 text-center">
          © {new Date().getFullYear()} FPT University Clubs Management. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer
