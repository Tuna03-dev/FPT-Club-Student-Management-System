import { createBrowserRouter } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/HomePage";
import { ClubLayout } from "@/layouts/ClubLayout";
import { StaffLayout } from "@/layouts/StaffLayout";

import { Dashboard } from "@/pages/myclub/Dashboard";
import MemberList from "@/pages/myclub/members/MemberList";
import { EventList } from "@/pages/myclub/events/EventList";
import { StaffEventList } from "@/pages/myclub/staff/StaffEventList";
import EventAttendancePage from "@/pages/myclub/events/attendance/AttendancePage";
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
import ClubDetailPage from "@/pages/myclub/ClubDetailPage";
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

import ClubOfficerGuard from "@/components/guards/ClubOfficerGuard";
import ForbiddenPage from "@/pages/ForbiddenPage";

import DraftDetail from "@/pages/news/DraftDetail";
import RequestDetail from "@/pages/news/RequestDetail";
import StaffNewsDetail from "@/pages/news/StaffNewsDetail";
import StaffNewsEdit from "@/pages/news/StaffNewsEdit";

import { StaffReportManagement } from "@/pages/myclub/staff/reportManagement/StaffReport";
import { PeriodicReportClubs } from "@/pages/myclub/staff/reportManagement/PeriodicReportClubs";
import { ClubReportManagement } from "@/pages/myclub/report/ReportManagement";
import ProfileSettings from "@/pages/ProfileSettings";

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
        children: [
          { index: true, element: <ClubsPage /> },
          { path: ":id", element: <ClubDetailPage /> },
        ],
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
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        ),
      },
    ],
  },

  { path: "/login", element: <LoginPage /> },

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

  {
    path: "/staff",
    element: (
      <ProtectedRoute>
        <StaffLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "news", element: <StaffNewsList /> },
      { path: "news-editor", element: <StaffNewsEditor /> },
      { path: "news/requests/:id", element: <RequestDetail /> },
      { path: "news/drafts/:draftId", element: <DraftDetail /> },
      { path: "news/:id", element: <StaffNewsDetail /> },
      { path: "news/:id/edit", element: <StaffNewsEdit /> },
      { path: "events", element: <StaffEventList /> },
      { path: "settings", element: <Settings /> },
      { path: "reports", element: <StaffReportManagement /> },
      { path: "report/:reportId/clubs", element: <PeriodicReportClubs /> },
    ],
  },

  {
    path: "/myclub/:clubId",
    element: (
      <ProtectedRoute>
        <ClubLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },

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

      { path: "members", element: <MemberList /> },
      {
        path: "roles",
        element: (
          <ClubOfficerGuard>
            <RoleManagement />
          </ClubOfficerGuard>
        ),
      },
      {
        path: "pending-posts",
        element: (
          <ClubOfficerGuard>
            <PendingPosts />
          </ClubOfficerGuard>
        ),
      },
      { path: "events", element: <EventList /> },
      { path: "events/attendance/:eventId", element: <EventAttendancePage /> },
      { path: "recruitments", element: <RecruitmentManagement /> },
      { path: "finance", element: <Finance /> },
      { path: "payments", element: <Payment /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <Settings /> },
      { path: "teams/:teamId", element: <TeamDetailPage /> },
      { path: "reports", element: <ClubReportManagement /> },

      { path: "teams/:teamId/news-drafts", element: <TeamNewsDrafts /> },
      { path: "teams/:teamId/news-requests", element: <TeamNewsRequests /> },
      { path: "teams/:teamId/news-editor", element: <TeamNewsEditor /> },

      { path: "teams/:teamId/news/drafts/:draftId", element: <DraftDetail /> },
      { path: "teams/:teamId/news/requests/:id", element: <RequestDetail /> },

      { path: "teams/create", element: <TeamCreatePage /> },
    ],
  },

  { path: "/403", element: <ForbiddenPage /> },

  {
    path: "*",
    element: (
      <div className="flex items-center justify-center minih-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
          <p className="text-gray-600">Không tìm thấy trang</p>
        </div>
      </div>
    ),
  },
]);
