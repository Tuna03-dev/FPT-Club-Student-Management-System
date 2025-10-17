import {
  Home,
  Users,
  Calendar,
  Bell,
  Settings,
  Search,
  Menu,
  Shield,
  FileText,
  Clock,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authService } from "@/services/authService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const navItems = [
  { key: "dashboard", url: "/myclub", icon: Home },
  { key: "members", url: "/myclub/members", icon: Users },
  { key: "events", url: "/myclub/events", icon: Calendar },
  { key: "notifications", url: "/myclub/notifications", icon: Bell },
];

const managementItems = [
  {
    key: "permissions",
    url: "/myclub/permissions",
    icon: Shield,
    label: "Phân quyền",
  },
  {
    key: "pending_posts",
    url: "/myclub/pending-posts",
    icon: FileText,
    label: "Bài viết chờ duyệt",
  },
  {
    key: "manage_members",
    url: "/myclub/members",
    icon: Users,
    label: "Quản lý thành viên",
  },
  {
    key: "manage_events",
    url: "/myclub/events",
    icon: Calendar,
    label: "Quản lý sự kiện",
  },
  {
    key: "pending_requests",
    url: "/myclub/pending-requests",
    icon: Clock,
    label: "Yêu cầu chờ duyệt",
  },
];

const managementColors: Record<string, string> = {
  permissions: "bg-gradient-to-br from-purple-500 to-purple-600",
  pending_posts: "bg-gradient-to-br from-yellow-500 to-yellow-600",
  manage_members: "bg-gradient-to-br from-blue-500 to-blue-600",
  manage_events: "bg-gradient-to-br from-green-500 to-green-600",
  pending_requests: "bg-gradient-to-br from-orange-500 to-orange-600",
};

const teams = [
  { id: "1", name: "Ban Chuyên môn", slug: "chuyen-mon" },
  { id: "2", name: "Ban Truyền thông", slug: "truyen-thong" },
  { id: "3", name: "Ban Tổ chức", slug: "to-chuc" },
  { id: "4", name: "Ban Nội vụ", slug: "noi-vu" },
  { id: "5", name: "Ban Đối ngoại", slug: "doi-ngoai" },
];

const teamColors: Record<string, string> = {
  "chuyen-mon": "bg-gradient-to-br from-orange-500 to-orange-600",
  "truyen-thong": "bg-gradient-to-br from-blue-500 to-blue-600",
  "to-chuc": "bg-gradient-to-br from-green-500 to-green-600",
  "noi-vu": "bg-gradient-to-br from-purple-500 to-purple-600",
  "doi-ngoai": "bg-gradient-to-br from-pink-500 to-pink-600",
};

export const ClubLayout = () => {
  const { t } = useTranslation("common");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const success = await authService.logoutWithApi();
      if (!success) {
        console.warn("Logout API failed, but continuing with local logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      authService.logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
        {/* Facebook-style Horizontal Navbar */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
          <div className="flex h-14 items-center justify-between px-4 max-w-[1920px] mx-auto">
            {/* Left Section - Logo & Search */}
            <div className="flex items-center gap-4 flex-1 max-w-[320px]">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
              </div>
              <div className="relative w-full max-w-[240px] hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("search")}
                  className="pl-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Center Section - Navigation */}
            <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-[600px]">
              {navItems.map((item) => (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/myclub"}
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
                    <p>{t(`nav.${item.key}`)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>

            {/* Right Section - Actions & Profile */}
            <div className="flex items-center gap-2 flex-1 justify-end max-w-[320px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink to="/myclub/settings">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t("nav.settings")}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full relative"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t("nav.notifications")}</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  {t("logout", { defaultValue: "Đăng xuất" })}
                </Button>
              </div>

              {/* Mobile Menu */}
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
                          to={item.url}
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
                          <span className="text-sm">
                            {t(`management.${item.key}`)}
                          </span>
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <div className="border-t border-border my-1"></div>
                  <div className="px-2 py-1.5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {t("teams.title")}
                    </h3>
                    {teams.map((team) => (
                      <DropdownMenuItem key={team.id} asChild>
                        <NavLink
                          to={`/myclub/team/${team.slug}`}
                          className="flex items-center gap-3 w-full"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <div
                            className={`h-6 w-6 rounded-lg ${
                              teamColors[team.slug]
                            } flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                          >
                            {t(`teams.${team.slug}`).split(" ")[1]?.[0] || "T"}
                          </div>
                          <span className="text-sm">
                            {t(`teams.${team.slug}`)}
                          </span>
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Container with Sidebar and Main Content */}
        <div className="flex flex-1 w-full max-w-[1920px] mx-auto overflow-hidden">
          {/* Left Sidebar - Management & Departments */}
          <aside className="hidden lg:block w-64 border-r border-border bg-card h-[calc(100vh-56px)] sticky top-14">
            <nav className="pt-2 pb-4 px-4 space-y-6 h-full overflow-y-auto">
              {/* Management Section */}
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
                      to={item.url}
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
                      <span>{t(`management.${item.key}`)}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Teams Section */}
              <div>
                <div className="px-3 mb-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("teams.title")}
                  </h2>
                </div>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <NavLink
                      key={team.id}
                      to={`/myclub/team/${team.slug}`}
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
                          teamColors[team.slug]
                        } flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                      >
                        {t(`teams.${team.slug}`).split(" ")[1]?.[0] || "T"}
                      </div>
                      <span>{t(`teams.${team.slug}`)}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </nav>
          </aside>

          {/* Main Content - Render nested routes here */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};
