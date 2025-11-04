import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/HomePage";
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
import ProtectedRoute from "@/components/ProtectedRoute";
import MyClubRedirect from "@/pages/myclub/MyClubRedirect";
import ClubSelect from "@/pages/myclub/ClubSelect";
import TeamDetailPage from "@/pages/myclub/teams/TeamDetail";
import { RecruitmentManagement } from "@/pages/myclub/recruitmentManagement/RecruitmentManagement";
import Finance from "@/pages/myclub/finance/Finance";
import { StudentRecruitment } from "@/pages/studentRecruitment/StudentRecruitment";
import { ClubDetail } from "@/pages/clubDetail/ClubDetail";

import LoginPage from "@/pages/login/Login";

// ✅ Dùng alias @ cho thống nhất
import PresidentNewsList from "@/pages/news/PresidentNewsList";
import PresidentNewsEditor from "@/pages/news/PresidentNewsEditor";
import StaffNewsList from "@/pages/news/StaffNewsList";
import StaffNewsEditor from "@/pages/news/StaffNewsEditor";
import TeamNewsDrafts from "@/pages/news/TeamNewsDrafts";
import TeamNewsRequests from "@/pages/news/TeamNewsRequests";
import TeamNewsEditor from "@/pages/news/TeamNewsEditor";
import Payment from "@/pages/myclub/payments/MemberPaymentPage";
import { StaffReportManagement } from "@/pages/staffReportManagement/StaffReport";
import { PeriodicReportClubs } from "@/pages/staffReportManagement/PeriodicReportClubs";
export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },

      {
        path: "events",
        children: [
          { index: true, element: <EventsPage /> },
          { path: ":id", element: <EventDetailPage /> },
        ],
      },

      {
        path: "news",
        children: [
          { index: true, element: <NewsPageList /> },
          { path: ":id", element: <NewsPageDetail /> },
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

      { path: "myRecruitmentApplication", element: <StudentRecruitment /> },
      { path: "clubDetail/:clubId", element: <ClubDetail /> },
    ],
  },

  { path: "/login", element: <LoginPage /> },

  // Auto-redirect vào CLB của mình
  {
    path: "/myclub",
    element: (
      <ProtectedRoute>
        <MyClubRedirect />
      </ProtectedRoute>
    ),
  },

  {
    path: "/myclub/select",
    element: (
      <ProtectedRoute>
        <ClubSelect />
      </ProtectedRoute>
    ),
  },

  // ✅ Khu staff (tuyệt đối, có dấu /)
  {
    path: "/staff/news",
    element: (
      <ProtectedRoute>
        <StaffNewsList />
      </ProtectedRoute>
    ),
  },
  {
    path: "/staff/news-editor",
    element: (
      <ProtectedRoute>
        <StaffNewsEditor />
      </ProtectedRoute>
    ),
  },
  {
    path: "/staff/report",
    element: (
      <ProtectedRoute>
        <StaffReportManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: "/staff/report/:reportId/clubs",
    element: (
      <ProtectedRoute>
        <PeriodicReportClubs />
      </ProtectedRoute>
    ),
  },

  // ✅ Khu CLB
  {
    path: "/myclub/:clubId",
    element: (
      <ProtectedRoute>
        <ClubLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },

      // 🔥 Hai route của chủ nhiệm CLB để tạo/list news & draft
      { path: "news", element: <PresidentNewsList /> },
      { path: "news-editor", element: <PresidentNewsEditor /> },

      { path: "members", element: <MemberList /> },
      { path: "events", element: <EventList /> },
      { path: "recruitments", element: <RecruitmentManagement /> },
      { path: "finance", element: <Finance /> },
      { path: "payments", element: <Payment /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <Settings /> },
      { path: "teams/:teamId", element: <TeamDetailPage /> },

      { path: "myclub", element: <Navigate to="." replace /> },
      { path: "teams/:teamId/news-drafts", element: <TeamNewsDrafts /> },
      { path: "teams/:teamId/news-requests", element: <TeamNewsRequests /> },
      { path: "teams/:teamId/news-editor", element: <TeamNewsEditor /> },
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
