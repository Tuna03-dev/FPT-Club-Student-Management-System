import { createBrowserRouter } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/HomePage";
import { ClubLayout } from "@/layouts/ClubLayout";

import { Dashboard } from "@/pages/myclub/Dashboard";
import Members from "@/pages/myclub/members/MemberList";
import { EventList } from "@/pages/myclub/events/EventList";
import { Notifications } from "@/pages/myclub/Notifications";
import { Settings } from "@/pages/myclub/Settings";

import { EventsPage } from "@/pages/events/EventPageList";
import NewsPageList from "@/pages/news/NewsPageList";
import NewsPageDetail from "@/pages/news/NewsPageDetail";
import EventDetailPage from "@/pages/events/EventDetail";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage/LoginPage";
import MyClubRedirect from "@/pages/myclub/MyClubRedirect";
import ClubSelect from "@/pages/myclub/ClubSelect";
import TeamDetailPage from "@/pages/myclub/teams/TeamDetail";

export const router = createBrowserRouter([
  // Public shell
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },

      // Events
      {
        path: "events",
        children: [
          { index: true, element: <EventsPage /> },
          { path: ":id", element: <EventDetailPage /> },
        ],
      },

      // News
      {
        path: "news",
        children: [
          { index: true, element: <NewsPageList /> },
          { path: ":id", element: <NewsPageDetail /> },
        ],
      },

      { path: "clubs", element: <div className="container mx-auto px-4 py-8">Trang Câu lạc bộ/Hội nhóm</div> },
      { path: "achievements", element: <div className="container mx-auto px-4 py-8">Trang Thành tích</div> },
      { path: "contact", element: <div className="container mx-auto px-4 py-8">Trang Liên hệ</div> },
    ],
  },

  // Auth (tách riêng nếu muốn ẩn header/footer)
  { path: "/login", element: <LoginPage /> },

  // MyClub entry
  {
    path: "/myclub",
    element: (
      <ProtectedRoute>
        <MyClubRedirect />
      </ProtectedRoute>
    ),
  },

  // Select khi có nhiều CLB
  {
    path: "/myclub/select",
    element: (
      <ProtectedRoute>
        <ClubSelect />
      </ProtectedRoute>
    ),
  },

  // Khu vực nội bộ theo clubId
  {
    path: "/myclub/:clubId",
    element: (
      <ProtectedRoute>
        <ClubLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "members", element: <Members /> },
      { path: "events", element: <EventList /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <Settings /> },
      { path: "teams/:teamId", element: <TeamDetailPage /> }, // Team detail
    ],
  },

  // 404
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
]);
