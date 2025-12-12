// src/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/HomePage";
import { ClubLayout } from "@/layouts/ClubLayout";
import { StaffLayout } from "@/layouts/StaffLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import StaffList from "@/pages/admin/StaffList";
import CampusManagement from "@/pages/admin/CampusManagement";
import SemesterManagement from "@/pages/admin/SemesterManagement";

import { Dashboard } from "@/pages/myclub/Dashboard";
import MemberList from "@/pages/myclub/members/MemberList";
import { EventList } from "@/pages/myclub/events/EventList";
import { StaffEventList } from "@/pages/myclub/staff/StaffEventList";
import EventAttendancePage from "@/pages/myclub/events/attendance/AttendancePage";
import { Notifications } from "@/pages/myclub/Notifications";
import { Settings } from "@/pages/myclub/Settings";
import { ClubInforManagement } from "@/pages/myclub/infor/InforManagement";
import RequireAdmin from "@/components/guards/RequireAdmin";

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
import ClubsPage from "@/pages/myclub/ClubsPage";
import PresidentNewsList from "@/pages/news/PresidentNewsList";
import PresidentNewsEditor from "@/pages/news/PresidentNewsEditor";
import StaffNewsList from "@/pages/news/StaffNewsList";
import StaffNewsEditor from "@/pages/news/StaffNewsEditor";
import TeamNewsDrafts from "@/pages/news/TeamNewsDrafts";
import TeamNewsRequests from "@/pages/news/TeamNewsRequests";
import TeamNewsEditor from "@/pages/news/TeamNewsEditor";
import Payment from "@/pages/myclub/payments/MemberPaymentPage";
import TeamCreatePage from "@/pages/myclub/teams/TeamCreatePage";
import RoleManagement from "@/pages/myclub/RoleManagement";
import PendingPosts from "@/pages/myclub/PendingPosts";

import {
  ClubOfficerGuard,
  TeamOfficerGuard,
  ClubTreasurerGuard,
  ClubMemberGuard,
} from "@/components/guards";
import ForbiddenPage from "@/pages/ForbiddenPage";
import BannerAdminPage from "@/pages/admin/BannerAdminPage";
import { StaffReportManagement } from "@/pages/staff/reportManagement/StaffReport";
import { PeriodicReportClubs } from "@/pages/staff/reportManagement/PeriodicReportClubs";
import { ClubReportManagement } from "@/pages/myclub/report/ReportManagement";
import ProfileSettings from "@/pages/ProfileSettings";
import TeamNewsManagementPage from "@/pages/myclub/teams/TeamNewsManagementPage";
// === BỔ SUNG từ A ===
import DraftDetail from "@/pages/news/DraftDetail";
import RequestDetail from "@/pages/news/RequestDetail";
import StaffNewsDetail from "@/pages/news/StaffNewsDetail";
import StaffNewsEdit from "@/pages/news/StaffNewsEdit";
import ClubDetailPage from "@/pages/myclub/ClubDetailPage";
import StaffNotifications from "@/pages/myclub/staff/StaffNotifications";
import CreateClubPage from "@/pages/CreateClubPage";
import ClubCreationManagement from "@/pages/staff/ClubCreationManagement";
import { StaffClubsManagement } from "@/pages/staff/ClubManagement";
import AboutPage from "@/pages/AboutPage";

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

      // B giữ ClubsPage, bổ sung thêm /clubs/:id (từ A)
      {
        path: "clubs",
        children: [
          { index: true, element: <ClubsPage /> },
          { path: ":id", element: <ClubDetailPage /> }, // bổ sung từ A
        ],
      },
      {
        path: "notifications",
        element: (
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        ),
      },

      // B vẫn giữ các biến thể cũ để không phá link đang dùng
      { path: "club/:clubId", element: <ClubDetail /> },

      {
        path: "about",
        element: <AboutPage />,
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

      { path: "myRecruitmentApplications", element: <StudentRecruitment /> },
      { path: "clubDetail/:clubId", element: <ClubDetail /> }, // giữ nguyên của B
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: "create-club",
        element: (
          <ProtectedRoute>
            <CreateClubPage />
          </ProtectedRoute>
        ),
      },
    ],
  },

  { path: "/login", element: <LoginPage /> },

  // MyClub redirect + select
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
  // ===== Admin giữ nguyên theo B =====
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="staff" replace /> },
      { path: "staff", element: <StaffList /> },
      { path: "campus", element: <CampusManagement /> },
      { path: "semester", element: <SemesterManagement /> },
      {
        path: "settings",
        element: <div className="p-6">Cấu hình hệ thống</div>,
      },
      {
        path: "settings",
        element: <div className="p-6">Cấu hình hệ thống</div>,
      },
      {
        path: "/admin/banner",
        element: (
          <RequireAdmin>
            <BannerAdminPage />
          </RequireAdmin>
        ),
      },
    ],
  },

  // ===== MyClub khu vực club =====
  {
    path: "/myclub/:clubId",
    element: (
      <ProtectedRoute>
        <ClubLayout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard - chỉ cần là thành viên
      {
        index: true,
        element: (
          <ClubMemberGuard>
            <Dashboard />
          </ClubMemberGuard>
        ),
      },

      // ===== CLUB_OFFICER Routes =====
      {
        path: "news",
        element: (
          <ClubOfficerGuard>
            <PresidentNewsList />
          </ClubOfficerGuard>
        ),
      },
      {
        path: "news-editor",
        element: (
          <ClubOfficerGuard>
            <PresidentNewsEditor />
          </ClubOfficerGuard>
        ),
      },
      {
        path: "news/drafts/:draftId",
        element: (
          <ClubOfficerGuard>
            <DraftDetail />
          </ClubOfficerGuard>
        ),
      },
      {
        path: "news/requests/:id",
        element: (
          <ClubOfficerGuard>
            <RequestDetail />
          </ClubOfficerGuard>
        ),
      },
      {
        path: "roles",
        element: (
          <ClubOfficerGuard>
            <RoleManagement />
          </ClubOfficerGuard>
        ),
      },
      {
        path: "recruitments",
        element: (
          <ClubOfficerGuard>
            <RecruitmentManagement />
          </ClubOfficerGuard>
        ),
      },
      {
        path: "teams/create",
        element: (
          <ClubOfficerGuard>
            <TeamCreatePage />
          </ClubOfficerGuard>
        ),
      },

      // ===== CLUB_TREASURER Routes =====
      {
        path: "finance",
        element: (
          <ClubTreasurerGuard>
            <Finance />
          </ClubTreasurerGuard>
        ),
      },

      // ===== TEAM_OFFICER Routes =====
      {
        path: "pending-posts",
        element: (
          <TeamOfficerGuard>
            <PendingPosts />
          </TeamOfficerGuard>
        ),
      },
      {
        path: "reports",
        element: (
          <TeamOfficerGuard>
            <ClubReportManagement />
          </TeamOfficerGuard>
        ),
      },
      {
        path: "teams/:teamId/news-drafts",
        element: (
          <TeamOfficerGuard>
            <TeamNewsDrafts />
          </TeamOfficerGuard>
        ),
      },
      {
        path: "teams/:teamId/team-news",
        element: (
          <TeamOfficerGuard>
            <TeamNewsManagementPage />
          </TeamOfficerGuard>
        ),
      },

      {
        path: "teams/:teamId/news-requests",
        element: (
          <TeamOfficerGuard>
            <TeamNewsRequests />
          </TeamOfficerGuard>
        ),
      },
      {
        path: "teams/:teamId/news-editor",
        element: (
          <TeamOfficerGuard>
            <TeamNewsEditor />
          </TeamOfficerGuard>
        ),
      },
      {
        path: "teams/:teamId/news/drafts/:draftId",
        element: (
          <TeamOfficerGuard>
            <DraftDetail />
          </TeamOfficerGuard>
        ),
      },
      {
        path: "teams/:teamId/news/requests/:id",
        element: (
          <TeamOfficerGuard>
            <RequestDetail />
          </TeamOfficerGuard>
        ),
      },

      // ===== CLUB_MEMBER Routes =====
      {
        path: "members",
        element: (
          <ClubMemberGuard>
            <MemberList />
          </ClubMemberGuard>
        ),
      },
      {
        path: "events",
        element: (
          <ClubMemberGuard>
            <EventList />
          </ClubMemberGuard>
        ),
      },
      {
        path: "events/attendance/:eventId",
        element: (
          <ClubMemberGuard>
            <EventAttendancePage />
          </ClubMemberGuard>
        ),
      },
      {
        path: "payments",
        element: (
          <ClubMemberGuard>
            <Payment />
          </ClubMemberGuard>
        ),
      },
      // {
      //   path: "notifications",
      //   element: (
      //     <ClubMemberGuard>
      //       <Notifications />
      //     </ClubMemberGuard>
      //   ),
      // },
      {
        path: "settings",
        element: (
          <ClubMemberGuard>
            <Settings />
          </ClubMemberGuard>
        ),
      },
      {
        path: "information",
        element: (
          <ClubMemberGuard>
            <ClubInforManagement />
          </ClubMemberGuard>
        ),
      },
      {
        path: "teams/:teamId",
        element: (
          <ClubMemberGuard>
            <TeamDetailPage />
          </ClubMemberGuard>
        ),
      },
    ],
  },

  { path: "/403", element: <ForbiddenPage /> },

  // ===== Staff layout (events/settings/reports) giữ như B =====
  {
    path: "/staff",
    element: (
      <ProtectedRoute>
        <StaffLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "club-creation", element: <ClubCreationManagement /> },
      { path: "events", element: <StaffEventList /> },
      { path: "settings", element: <Settings /> },
      {
        path: "reports",
        element: <StaffReportManagement />,
      },
      {
        path: "clubs",
        element: <StaffClubsManagement />,
      },
      {
        path: "report/:reportId/clubs",
        element: <PeriodicReportClubs />,
      },
      { path: "news", element: <StaffNewsList /> },
      { path: "news-editor", element: <StaffNewsEditor /> },
      { path: "news/:id", element: <StaffNewsDetail /> },
      { path: "news/:id/edit", element: <StaffNewsEdit /> },
      { path: "news/drafts/:draftId", element: <DraftDetail /> },
      { path: "news/requests/:id", element: <RequestDetail /> },
      { path: "notifications", element: <StaffNotifications /> },
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
