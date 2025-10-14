import { createBrowserRouter } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import HomePage from "../pages/HomePage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "events",
        element: <div className="container mx-auto px-4 py-8">Trang Sự Kiện</div>,
      },
      {
        path: "news",
        element: <div className="container mx-auto px-4 py-8">Trang Tin Tức</div>,
      },
      {
        path: "clubs",
        element: <div className="container mx-auto px-4 py-8">Trang Câu lạc bộ/Hội nhóm</div>,
      },
      {
        path: "achievements",
        element: <div className="container mx-auto px-4 py-8">Trang Thành tích</div>,
      },
      {
        path: "contact",
        element: <div className="container mx-auto px-4 py-8">Trang Liên hệ</div>,
      },
    ],
  },
  {
    path: "*",
    element: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
          <p className="text-gray-600">Không tìm thấy trang</p>
        </div>
      </div>
    ),
  },
])
