import { createBrowserRouter, Navigate } from "react-router-dom";
import { ClubLayout } from "@/layouts/ClubLayout";

import { Dashboard } from "@/pages/myclub/Dashboard";
import { MemberList } from "@/pages/myclub/members/MemberList";
import { EventList } from "@/pages/myclub/events/EventList";
import { Notifications } from "@/pages/myclub/Notifications";
import { Settings } from "@/pages/myclub/Settings";

/**
 * Main application router
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/myclub" replace />,
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
    element: <Navigate to="/" replace />,
  },
]);
