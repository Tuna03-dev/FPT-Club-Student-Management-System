// src/layouts/AdminLayout.tsx
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
import {
  Menu,
  Search,
  Users,
  Settings,
  Bell,
  ShieldCheck,
  Building,
  Calendar,
  LayoutTemplate,
} from "lucide-react";

const topNav = [{ key: "dashboard", url: "/admin", label: "Admin" }];

const managementItems = [
  {
    key: "staff",
    url: "/admin/staff",
    icon: Users,
    label: "Quản lý nhân viên",
  },
  {
    key: "campus",
    url: "/admin/campus",
    icon: Building,
    label: "Quản lý cơ sở",
  },
  {
    key: "semester",
    url: "/admin/semester",
    icon: Calendar,
    label: "Quản lý kỳ học",
  },
  {
    key: "system",
    url: "/admin/settings",
    icon: Settings,
    label: "Cấu hình hệ thống",
  },
  {
    key: "banner",
    url: "/admin/banner",
    icon: LayoutTemplate,
    label: "Cấu hình Banner",
  },
];

const colorByKey: Record<string, string> = {
  staff: "bg-gradient-to-br from-blue-500 to-blue-600",
  campus: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  semester: "bg-gradient-to-br from-purple-500 to-purple-600",
  system: "bg-gradient-to-br from-slate-500 to-slate-600",
  banner: "bg-gradient-to-br from-pink-500 to-rose-600",
};

export const AdminLayout = () => {
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
            <div className="flex items-center gap-4 flex-1 max-w-[320px]">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow">
                <ShieldCheck className="h-5 w-5" />
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

            <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-[600px]">
              {topNav.map((item) => (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.url}
                      end
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
                          <span className="font-medium">{item.label}</span>
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

            <div className="flex items-center gap-2 flex-1 justify-end max-w-[320px]">
              <NavLink to="/admin/settings">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="h-5 w-5" />
                </Button>
              </NavLink>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  {t("logout", { defaultValue: "Đăng xuất" })}
                </Button>
              </div>

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
                            className={`h-6 w-6 rounded-lg ${colorByKey[item.key]} flex items-center justify-center text-white shadow-sm`}
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

        <div className="flex flex-1 w-full max-w-[1920px] mx-auto overflow-hidden">
          <aside className="hidden lg:block w-64 border-r border-border bg-card h-[calc(100vh-56px)] sticky top-14">
            <nav className="pt-2 pb-4 px-4 space-y-6 h-full overflow-y-auto">
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
                        className={`h-8 w-8 rounded-lg ${colorByKey[item.key]} flex items-center justify-center text-white shadow-sm`}
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
