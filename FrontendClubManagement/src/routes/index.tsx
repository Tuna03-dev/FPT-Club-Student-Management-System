import { createBrowserRouter, Navigate } from "react-router-dom";
import { ClubLayout } from "@/layouts/ClubLayout";

import { Dashboard } from "@/pages/myclub/Dashboard";
import Members from "@/pages/myclub/members/MemberList";
import { EventList } from "@/pages/myclub/events/EventList";
import { Notifications } from "@/pages/myclub/Notifications";
import { Settings } from "@/pages/myclub/Settings";
import { EventsPage } from "@/pages/events/EventPageList";
import NewsPageList from "@/pages/news/NewsPageList";
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
    element: <Navigate to="/myclub" replace />,
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
        element: <Members />,
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
    element: <div>404 Not Found</div>,
  },
]);

/**
 * USAGE EXAMPLES:
 *
 * 1. Basic Route:
 * {
 *   path: '/about',
 *   element: <AboutPage />,
 * }
 *
 * 2. Nested Routes:
 * {
 *   path: '/dashboard',
 *   element: <DashboardLayout />,
 *   children: [
 *     { index: true, element: <DashboardHome /> },
 *     { path: 'settings', element: <Settings /> },
 *   ]
 * }
 *
 * 3. Lazy Loading:
 * const HomePage = lazy(() => import('@/pages/Home'));
 * {
 *   path: '/',
 *   element: <Suspense fallback={<Loading />}><HomePage /></Suspense>
 * }
 *
 * 4. Protected Routes:
 * {
 *   path: '/admin',
 *   element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
 *   children: [...]
 * }
 *
 * 5. Dynamic Routes:
 * {
 *   path: '/users/:userId',
 *   element: <UserProfile />,
 * }
 *
 * 6. Route with Loader (Data Fetching):
 * {
 *   path: '/posts/:postId',
 *   element: <PostDetail />,
 *   loader: async ({ params }) => {
 *     return fetch(`/api/posts/${params.postId}`);
 *   }
 * }
 */
