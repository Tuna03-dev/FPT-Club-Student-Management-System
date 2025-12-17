// src/layouts/StaffLayout.tsx
import {
  Calendar,
  Bell,
  Menu,
  FileText,
  Users,
  Home,
  Building2,
  UserSquare2,
  LogOut,
  User,
  FileSignature,
  Shield,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useMyClubs from "@/hooks/useMyClubs";
import { authService } from "@/services/authService";
// translations not needed in staff header
import { StaffNotificationBell } from "@/components/notifications/StaffNotificationBell";
import { useWebSocket, type EventWebSocketPayload } from "@/hooks/useWebSocket";
import { toast } from "sonner";

const navItems = [
  { key: "events", url: "/events", icon: Calendar, label: "Sự kiện" },
];

// Management items for Staff
const managementItems = [
  {
    key: "manage_club_creation",
    url: "/club-creation",
    icon: Building2,
    label: "Các yêu cầu thành lập CLB",
  },
  {
    key: "manage_club",
    url: "/clubs",
    icon: UserSquare2,
    label: "Quản lý CLB",
  },
  {
    key: "manage_events",
    url: "/events",
    icon: Calendar,
    label: "Quản lý sự kiện",
  },
  // {
  //   key: "pending_requests",
  //   url: "/pending-requests",
  //   icon: Clock,
  //   label: "Yêu cầu chờ duyệt",
  // },
  {
    key: "pending_posts",
    url: "/news",
    icon: FileText,
    label: "Quản lý tin tức",
  },
  // {
  //   key: "manage_members",
  //   url: "/members",
  //   icon: Users,
  //   label: "Quản lý thành viên",
  // },
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
  manage_club: "bg-gradient-to-br from-red-500 to-red-600",
};

export const StaffLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showClubsList, setShowClubsList] = useState(false);
  const navigate = useNavigate();

  // WebSocket setup for Staff event notifications
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToSystemRole } = useWebSocket(token);

  // Subscribe to STAFF role for event notifications
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribeToSystemRole("STAFF", (msg) => {
      if (msg.type !== "EVENT") return;

      const payload = msg.payload as EventWebSocketPayload;

      if (msg.action === "REQUEST_SUBMITTED") {
        toast.info("Yêu cầu tạo sự kiện mới", {
          description:
            payload.message ||
            `Có yêu cầu tạo sự kiện "${payload.eventTitle}" chờ duyệt`,
          action: {
            label: "Xem",
            onClick: () => navigate("/myclub/staff/events"),
          },
        });
      }
    });

    return () => unsubscribe?.();
  }, [isConnected, subscribeToSystemRole, navigate]);

  // Load user info for header
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const isAuthenticated = authService.isAuthenticated();

  const shouldLoadMyClubs = isAuthenticated && !!user;
  const {
    data: clubs,
    loading: clubsLoading,
    error: clubsError,
  } = useMyClubs(shouldLoadMyClubs);

  const normalizedSystemRole = user?.systemRole
    ? String(user.systemRole).trim().toUpperCase()
    : "";
  const isAdmin =
    normalizedSystemRole === "ADMIN" || normalizedSystemRole === "MANAGER";
  const isStaff = normalizedSystemRole === "STAFF";

  const handleLogout = async () => {
    try {
      await authService.logoutWithApi();
    } catch {
      /* ignore */
    } finally {
      authService.logout();
      toast.success("Đăng xuất thành công!", { duration: 2000 });
      navigate("/", { replace: true });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
        <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
          <div className="flex h-14 items-center justify-between px-4 max-w-[1920px] mx-auto">
            {/* Left */}
            <div className="flex items-center gap-4 flex-1 max-w-[320px]">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
            </div>

            {/* Center */}
            <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-[600px]">
              {navItems
                .filter((item) => item.key !== "events")
                .map((item) => (
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

            {/* Right */}
            <div className="flex items-center gap-3 flex-1 justify-end max-w-[320px]">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-2 hover:bg-orange-50 transition"
                onClick={() => navigate("/")}
              >
                <Home className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-orange-600">Trang chủ</span>
              </Button>
              <StaffNotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-orange-50 transition">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                      <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                        {user?.fullName
                          ? user.fullName
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          : "S"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-[15px] font-medium text-gray-700 max-w-[120px] truncate">
                      {user?.fullName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 max-h-[30rem] overflow-y-auto rounded-md shadow-lg"
                >
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-[14px] font-semibold text-gray-800">
                        {user?.fullName}
                      </p>
                      <p className="text-[13px] text-gray-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!showClubsList ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => navigate("/profile")}
                        className="cursor-pointer text-[14px] text-gray-700"
                      >
                        <User className="mr-2 h-4 w-4 text-orange-500" />
                        Thông tin cá nhân
                      </DropdownMenuItem>
                      {!clubsLoading &&
                        !clubsError &&
                        clubs &&
                        clubs.length > 0 && (
                          <DropdownMenuItem
                            onClick={() => setShowClubsList(true)}
                            onSelect={(e) => e.preventDefault()}
                            className="cursor-pointer text-[14px] text-gray-700"
                          >
                            <Users className="mr-2 h-4 w-4 text-orange-500" />
                            Câu lạc bộ của tôi
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuItem
                        onClick={() => navigate("/myRecruitmentApplications")}
                        className="cursor-pointer text-[14px] text-gray-700"
                      >
                        <FileSignature className="mr-2 h-4 w-4 text-orange-500" />
                        Đơn ứng tuyển của tôi
                      </DropdownMenuItem>
                      {isStaff && (
                        <DropdownMenuItem
                          onClick={() => navigate("/staff/club-creation")}
                          className="cursor-pointer text-[14px] text-gray-700"
                        >
                          <Building2 className="mr-2 h-4 w-4 text-orange-500" />
                          Trang quản lý của ICPDP
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => navigate("/admin")}
                          className="cursor-pointer text-[14px] text-gray-700"
                        >
                          <Shield className="mr-2 h-4 w-4 text-orange-500" />
                          Trang quản trị
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-[14px] text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Đăng xuất
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => setShowClubsList(false)}
                        onSelect={(e) => e.preventDefault()}
                        className="cursor-pointer text-[13px] text-gray-500"
                      >
                        ← Quay lại
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="px-3 py-1.5 text-[14px] font-semibold text-gray-800">
                        CLB của bạn
                      </DropdownMenuLabel>
                      {clubsLoading && (
                        <div className="px-3 py-2 text-[14px] text-gray-500">
                          Đang tải danh sách CLB…
                        </div>
                      )}
                      {clubsError && (
                        <div className="px-3 py-2 text-[14px] text-red-600">
                          {String(clubsError)}
                        </div>
                      )}
                      {!clubsLoading &&
                        !clubsError &&
                        (!clubs || clubs.length === 0) && (
                          <div className="px-3 py-2 text-[14px] text-gray-500">
                            Bạn chưa thuộc CLB nào.
                          </div>
                        )}
                      {!clubsLoading &&
                        !clubsError &&
                        clubs?.map((club: any) => (
                          <DropdownMenuItem
                            key={club.clubId}
                            onClick={() => {
                              localStorage.setItem(
                                "lastClubId",
                                String(club.clubId)
                              );
                              setShowClubsList(false);
                              navigate(`/myclub/${club.clubId}`);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 w-full">
                              {club.logoUrl ? (
                                <img
                                  src={club.logoUrl}
                                  alt={club.clubName}
                                  className="h-9 w-9 rounded-md object-cover"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">
                                    {club.clubName?.charAt(0) || "C"}
                                  </span>
                                </div>
                              )}
                              <span className="text-[14px] truncate text-gray-700">
                                {club.clubName}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

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
                            className={`h-6 w-6 rounded-lg ${managementColors[item.key]} flex items-center justify-center text-white shadow-sm`}
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
