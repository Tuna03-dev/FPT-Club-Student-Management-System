import type React from "react";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow sticky top-0 z-40">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/Logo_Trường_Đại_học_FPT.svg"
              alt="FPT"
              className="h-10"
            />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-orange-600">
                TỔ CHỨC GIÁO DỤC FPT
              </div>
              <div className="text-xs text-gray-500">Clubs & Events</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Trang chủ
            </Link>
            <Link
              to="/clubs"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Câu lạc bộ
            </Link>
            <Link
              to="/events"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Sự kiện
            </Link>
            <Link
              to="/news"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Tin tức
            </Link>
            <Link
              to="/about"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Giới thiệu
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden sm:inline-block bg-transparent border border-orange-500 text-orange-500 px-4 py-2 rounded-md font-medium hover:bg-orange-50">
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
