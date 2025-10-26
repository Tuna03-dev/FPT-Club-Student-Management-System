import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/HomePage";
import { ClubLayout } from "@/layouts/ClubLayout";

import { Dashboard } from "@/pages/myclub/Dashboard";
import MemberList from "@/pages/myclub/members/MemberList";
import { EventList } from "@/pages/myclub/events/EventList";
import { Notifications } from "@/pages/myclub/Notifications";
import { Settings } from "@/pages/myclub/Settings";

import { EventsPage } from "@/pages/events/EventPageList";
import NewsPageList from "@/pages/news/NewsPageList";
import NewsPageDetail from "@/pages/news/NewsPageDetail";
import EventDetailPage from "@/pages/events/EventDetail";
import LoginPage from "@/pages/login/Login";
import { RecruitmentManagement } from "@/pages/myclub/recruitmentManagement/RecruitmentManagement";
import { StudentRecruitment } from "@/pages/studentRecruitment/StudentRecruitment";
import { ClubDetail } from "@/pages/clubDetail/ClubDetail";

/**
 * Main application router
 */
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
        children: [
          {
            index: true,
            element: <EventsPage />,
          },
          {
            path: ":id",
            element: <EventDetailPage />,
          },
        ],
      },
      {
        path: "news",
        children: [
          {
            index: true,
            element: <NewsPageList />,
          },
          {
            path: ":id",
            element: <NewsPageDetail />,
          },
        ],
      },
      {
        path: "clubs",
        element: (
          <div className="container mx-auto px-4 py-8">
            Trang Câu lạc bộ/Hội nhóm
          </div>
        ),
      },
      {
        path: "achievements",
        element: (
          <div className="container mx-auto px-4 py-8">Trang Thành tích</div>
        ),
      },
      {
        path: "contact",
        element: (
          <div className="container mx-auto px-4 py-8">Trang Liên hệ</div>
        ),
      },
      {
        path: "myclub",
        element: <Navigate to="/myclub" replace />,
      },
    ],
  },
  {
    path: "/events",
    element: <EventsPage />,
  },
  {
    path: "/events/:id",
    element: <EventDetailPage />,
  },
  {
    path: "news",
    element: <NewsPageList />,
  },
  {
    path: "myRecruitmentApplication",
    element: <StudentRecruitment />,
  },
  {
    path: "clubDetail/:clubId",
    element: <ClubDetail />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/myclub",
    element: <ClubLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "members",
        element: <MemberList />,
      },
      {
        path: "events",
        element: <EventList />,
      },
      {
        path: "recruitments",
        element: <RecruitmentManagement />,
      },
      {
        path: "notifications",
        element: <Notifications />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "team/:slug",
        element: <Dashboard />,
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
]);
