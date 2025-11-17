// src/layouts/StaffLayout.tsx
import {
  Calendar,
  Bell,
  Settings,
  Menu,
  Search,
  Clock,
  FileText,
  Users,
  Home,
  Building2,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authService } from "@/services/authService";
import { useTranslation } from "react-i18next";
import { StaffNotificationBell } from "@/components/notifications/StaffNotificationBell";

const navItems = [
  { key: "events", url: "/events", icon: Calendar, label: "Sự kiện" },
];

// Management items for Staff
const managementItems = [
  {
    key: "manage_club_creation",
    url: "/club-creation",
    icon: Building2,
    label: "Thành lập CLB",
  },
  {
    key: "manage_events",
    url: "/events",
    icon: Calendar,
    label: "Quản lý sự kiện",
  },
  {
    key: "pending_requests",
    url: "/pending-requests",
    icon: Clock,
    label: "Yêu cầu chờ duyệt",
  },
  {
    key: "pending_posts",
    url: "/news",
    icon: FileText,
    label: "Bài viết chờ duyệt",
  },
  {
    key: "manage_members",
    url: "/members",
    icon: Users,
    label: "Quản lý thành viên",
  },
  {
    key: "manage_reports",
    url: "/reports",
    icon: FileText,
    label: "Quản lý báo cáo",
  },
  {
    key: "staff_notifications",
    url: "/notifications",
    icon: Bell,
    label: "Thông báo",
  },
];

const managementColors: Record<string, string> = {
  manage_club_creation: "bg-gradient-to-br from-purple-500 to-purple-600",
  manage_events: "bg-gradient-to-br from-green-500 to-green-600",
  pending_requests: "bg-gradient-to-br from-orange-500 to-orange-600",
  pending_posts: "bg-gradient-to-br from-yellow-500 to-yellow-600",
  manage_members: "bg-gradient-to-br from-blue-500 to-blue-600",
  manage_reports: "bg-gradient-to-br from-pink-500 to-pink-600",
  staff_notifications: "bg-gradient-to-br from-purple-500 to-purple-600", 
};

export const StaffLayout = () => {
  const { t } = useTranslation("common");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logoutWithApi();
    } catch {
      /* ignore */
    } finally {
      authService.logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
        <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
          <div className="flex h-14 items-center justify-between px-4 max-w-[1920px] mx-auto">
            {/* Left: logo + search */}
            <div className="flex items-center gap-4 flex-1 max-w-[320px]">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div className="relative w-full max-w-[240px] hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("search")}
                  className="pl-9 h-9 bg-secondary/50 border-0"
                />
              </div>
            </div>

            {/* Center: nav */}
            <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-[600px]">
              {navItems.map((item) => (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={`/myclub/staff${item.url}`}
                      end={item.url === ""}
                      className={({ isActive }) =>
                        `flex items-center justify-center px-8 py-2 rounded-lg transition-all relative ${
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:bg-secondary"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className="h-6 w-6" />
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-md" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>

            {/* Right: user */}
            <div className="flex items-center gap-2 flex-1 justify-end max-w-[320px]">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-2"
                onClick={() => navigate("/")}
              >
                <Home className="h-4 w-4" />
                <span>Trang chủ</span>
              </Button>
              <NavLink to="/myclub/staff/settings">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="h-5 w-5" />
                </Button>
              </NavLink>
              <StaffNotificationBell />
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>S</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  {t("logout", { defaultValue: "Đăng xuất" })}
                </Button>
              </div>

              {/* Mobile menu */}
              <DropdownMenu
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-1.5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      QUẢN LÝ
                    </h3>
                    {managementItems.map((item) => (
                      <DropdownMenuItem key={item.key} asChild>
                        <NavLink
                          to={`/myclub/staff${item.url}`}
                          className="flex items-center gap-3 w-full"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <div
                            className={`h-6 w-6 rounded-lg ${
                              managementColors[item.key]
                            } flex items-center justify-center text-white shadow-sm`}
                          >
                            <item.icon className="h-3 w-3" />
                          </div>
                          <span className="text-sm">{item.label}</span>
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 w-full max-w-[1920px] mx-auto overflow-hidden">
          <aside className="hidden lg:block w-64 border-r border-border bg-card h-[calc(100vh-56px)] sticky top-14">
            <nav className="pt-2 pb-4 px-4 space-y-6 h-full overflow-y-auto">
              {/* Management */}
              <div>
                <div className="px-3 mb-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    QUẢN LÝ
                  </h2>
                </div>
                <div className="space-y-2">
                  {managementItems.map((item) => (
                    <NavLink
                      key={item.key}
                      to={`/staff${item.url}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-foreground hover:bg-secondary"
                        }`
                      }
                    >
                      <div
                        className={`h-8 w-8 rounded-lg ${
                          managementColors[item.key]
                        } flex items-center justify-center text-white shadow-sm`}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </nav>
          </aside>

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};
