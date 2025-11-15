import {
  Home,
  Users,
  Calendar,
  Bell,
  Search,
  Menu,
  Shield,
  FileText,
  Clock,
  Briefcase,
  DollarSign,
  Wallet,
  Plus,
  Newspaper,
} from "lucide-react";
import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { authService, type UserInfo } from "@/services/authService";
import { useTeams } from "@/hooks/useTeams";
import useMyClubs from "@/hooks/useMyClubs";
import { PermissionContext } from "@/contexts/PermissionContext";
import { useClubPermissions } from "@/hooks/useClubPermissions";

const navItems = [
  { key: "dashboard", url: "", icon: Home },
  { key: "members", url: "/members", icon: Users },
  { key: "events", url: "/events", icon: Calendar },
  { key: "payments", url: "/payments", icon: Wallet },
  { key: "notifications", url: "/notifications", icon: Bell },
];

// Define permission levels for each menu item
type PermissionLevel = "CLUB_OFFICER" | "TEAM_OFFICER" | "MEMBER";

interface ManagementItem {
  key: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiredRole: PermissionLevel; // Minimum role required
}

const managementItems: ManagementItem[] = [
  {
    key: "club_news",
    url: "/news",
    icon: Newspaper,
    label: "Quản lý tin tức",
    requiredRole: "CLUB_OFFICER",
  },
  {
    key: "permissions",
    url: "/roles",
    icon: Shield,
    label: "Phân quyền",
    requiredRole: "CLUB_OFFICER",
  },
  {
    key: "pending_posts",
    url: "/pending-posts",
    icon: FileText,
    label: "Bài viết chờ duyệt",
    requiredRole: "TEAM_OFFICER",
  },
  {
    key: "manage_members",
    url: "/members",
    icon: Users,
    label: "Danh sách thành viên",
    requiredRole: "MEMBER", // Everyone can view, but actions are restricted
  },
  {
    key: "manage_events",
    url: "/events",
    icon: Calendar,
    label: "Quản lý sự kiện",
    requiredRole: "TEAM_OFFICER",
  },
  {
    key: "manage_recruitments",
    url: "/recruitments",
    icon: Briefcase,
    label: "Quản lý tuyển thành viên",
    requiredRole: "CLUB_OFFICER",
  },
  {
    key: "manage_reports",
    url: "/reports",
    icon: FileText,
    label: "Quản lý báo cáo",
    requiredRole: "TEAM_OFFICER",
  },
  {
    key: "manage_finance",
    url: "/finance",
    icon: DollarSign,
    label: "Quản lý tài chính",
    requiredRole: "CLUB_OFFICER",
  },
  {
    key: "pending_requests",
    url: "/pending-requests",
    icon: Clock,
    label: "Yêu cầu chờ duyệt",
    requiredRole: "CLUB_OFFICER",
  },
];

const managementColors: Record<string, string> = {
  permissions: "bg-gradient-to-br from-purple-500 to-purple-600",
  pending_posts: "bg-gradient-to-br from-yellow-500 to-yellow-600",
  manage_members: "bg-gradient-to-br from-blue-500 to-blue-600",
  manage_events: "bg-gradient-to-br from-green-500 to-green-600",
  manage_recruitments: "bg-gradient-to-br from-red-500 to-red-600",
  manage_finance: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  pending_requests: "bg-gradient-to-br from-orange-500 to-orange-600",
  manage_reports: "bg-gradient-to-br from-pink-500 to-pink-600",
  club_news: "bg-gradient-to-br from-indigo-500 to-indigo-600",
};

export const ClubLayout = () => {
  const { t } = useTranslation("common");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showClubsList, setShowClubsList] = useState(false);
  const navigate = useNavigate();

  const { clubId = "0" } = useParams();
  const numericClubId = Number(clubId);
  const validClubId = Number.isFinite(numericClubId) && numericClubId > 0;

  // Load clubs list
  const shouldLoadMyClubs = isAuthenticated && !!user;
  const {
    data: clubs,
    loading: clubsLoading,
    error: clubsError,
  } = useMyClubs(shouldLoadMyClubs);

  // Load user info
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser();
      const authenticated = authService.isAuthenticated();
      setUser(currentUser);
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    window.addEventListener("storage", checkAuth);
    const handleAuthChange = () => checkAuth();
    window.addEventListener("auth-state-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-state-changed", handleAuthChange);
    };
  }, []);

  // ===== Teams for sidebar =====
  const {
    data: teams,
    loading: teamsLoading,
    error: teamsError,
  } = useTeams(validClubId ? numericClubId : undefined);

  // ===== Check permissions from localStorage (unified approach) =====
  const {
    isClubOfficer,
    isTeamOfficer,
    loading: permissionsLoading,
  } = useClubPermissions(validClubId ? numericClubId : undefined);

  // Ghi nhớ firstTeamId (chỉ để UX list, không ảnh hưởng permission)
  if (teams?.[0]?.teamId && validClubId) {
    const key = `firstTeamId:${numericClubId}`;
    try {
      const prev = sessionStorage.getItem(key);
      const prevVal = prev ? JSON.parse(prev)?.value : undefined;
      if (prevVal !== teams[0].teamId) {
        sessionStorage.setItem(
          key,
          JSON.stringify({ value: teams[0].teamId, at: Date.now() })
        );
      }
    } catch {
      /* empty */
    }
  }

  // Determine user's role level
  const userRoleLevel: PermissionLevel = useMemo(() => {
    if (permissionsLoading) return "MEMBER"; // Default while loading
    if (isClubOfficer) return "CLUB_OFFICER";
    if (isTeamOfficer) return "TEAM_OFFICER";
    return "MEMBER";
  }, [isClubOfficer, isTeamOfficer, permissionsLoading]);

  // Filter menu based on user permissions and update labels
  const filteredManagementItems = useMemo(() => {
    if (permissionsLoading) return [];

    const roleHierarchy: Record<PermissionLevel, number> = {
      CLUB_OFFICER: 3,
      TEAM_OFFICER: 2,
      MEMBER: 1,
    };

    return managementItems
      .filter((item) => {
        // Check if user has required role level
        return roleHierarchy[userRoleLevel] >= roleHierarchy[item.requiredRole];
      })
      .map((item) => {
        // Update labels for members (more view-oriented)
        if (userRoleLevel === "MEMBER") {
          if (item.key === "manage_members") {
            return { ...item, label: "Thành viên" };
          }
          if (item.key === "manage_events") {
            return { ...item, label: "Sự kiện" };
          }
        }
        return item;
      });
  }, [userRoleLevel, permissionsLoading]);
  // CHỈ hiện "Quản lí tin tức" khi amOfficer === true

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

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

  if (!validClubId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Không xác định được câu lạc bộ. Vui lòng quay lại trang MyClub.
      </div>
    );
  }

  return (
    <PermissionContext.Provider
      value={{ isOfficer: isClubOfficer, loading: permissionsLoading }}
    >
      <TooltipProvider delayDuration={200}>
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
          {/* ===== HEADER ===== */}
          <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
            <div className="flex h-14 items-center justify-between px-4 max-w-[1920px] mx-auto">
              {/* Left */}
              <div className="flex items-center gap-4 flex-1 max-w-[320px]">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
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

              {/* Center */}
              <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-[600px]">
                {navItems.map((item) => (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={`/myclub/${clubId}${item.url}`}
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
                      <p>{t(`nav.${item.key}`)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </nav>

              {/* Right */}
              <div className="flex items-center gap-3 flex-1 justify-end max-w-[320px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex items-center gap-2 hover:bg-secondary/80"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Trang chủ</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full relative hover:bg-secondary/80"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-secondary/80 transition-all duration-200">
                      <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                        <AvatarImage
                          src={user?.avatarUrl}
                          alt={user?.fullName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold">
                          {user ? getInitials(user.fullName) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                        {user?.fullName || "User"}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-60 max-h-[30rem] overflow-y-auto rounded-md shadow-lg"
                  >
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-semibold">
                          {user?.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {!showClubsList ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => navigate("/profile")}
                          className="cursor-pointer"
                        >
                          Thông tin cá nhân
                        </DropdownMenuItem>

                        {/* "Câu lạc bộ của tôi" chỉ khi có CLB */}
                        {!clubsLoading &&
                          !clubsError &&
                          clubs &&
                          clubs.length > 0 && (
                            <DropdownMenuItem
                              onClick={() => setShowClubsList(true)}
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer"
                            >
                              Câu lạc bộ của tôi
                            </DropdownMenuItem>
                          )}

                        <DropdownMenuItem
                          onClick={() => navigate("/create-club")}
                          className="cursor-pointer"
                        >
                          Đăng ký thành lập CLB
                        </DropdownMenuItem>

                        {isStaff && (
                          <DropdownMenuItem
                            onClick={() => navigate("/staff/club-creation")}
                            className="cursor-pointer"
                          >
                            Trang quản lý của ICPDP
                          </DropdownMenuItem>
                        )}

                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => navigate("/admin")}
                            className="cursor-pointer"
                          >
                            Trang quản trị
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="cursor-pointer text-red-600"
                        >
                          Đăng xuất
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => setShowClubsList(false)}
                          onSelect={(e) => e.preventDefault()}
                          className="cursor-pointer text-xs text-muted-foreground"
                        >
                          ← Quay lại
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-sm font-semibold">
                          CLB của bạn
                        </DropdownMenuLabel>

                        {clubsLoading && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Đang tải danh sách CLB…
                          </div>
                        )}
                        {clubsError && (
                          <div className="px-3 py-2 text-sm text-red-600">
                            {clubsError}
                          </div>
                        )}
                        {!clubsLoading &&
                          !clubsError &&
                          (!clubs || clubs.length === 0) && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Bạn chưa thuộc CLB nào.
                            </div>
                          )}

                        {!clubsLoading &&
                          !clubsError &&
                          clubs?.map((club) => (
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
                                  <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/40 to-primary/60 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">
                                      {club.clubName?.charAt(0) || "C"}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm truncate">
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
                        {userRoleLevel === "CLUB_OFFICER"
                          ? "QUẢN LÝ"
                          : userRoleLevel === "TEAM_OFFICER"
                          ? "QUẢN LÝ"
                          : "DANH MỤC"}
                      </h3>
                      {filteredManagementItems.map((item) => (
                        <DropdownMenuItem key={item.key} asChild>
                          <NavLink
                            to={`/myclub/${clubId}${item.url}`}
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

          {/* ===== BODY ===== */}
          <div className="flex flex-1 w-full max-w-[1920px] mx-auto overflow-hidden">
            <aside className="hidden lg:block w-64 border-r border-border bg-card h-[calc(100vh-56px)] sticky top-14">
              <nav className="pt-2 pb-4 px-4 space-y-6 h-full overflow-y-auto">
                {/* Management */}
                {filteredManagementItems.length > 0 && (
                  <div>
                    <div className="px-3 mb-4">
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {userRoleLevel === "CLUB_OFFICER"
                          ? "QUẢN LÝ"
                          : userRoleLevel === "TEAM_OFFICER"
                          ? "QUẢN LÝ"
                          : "DANH MỤC"}
                      </h2>
                      {!permissionsLoading && userRoleLevel === "MEMBER" && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Xem thông tin CLB
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {filteredManagementItems.map((item) => (
                        <NavLink
                          key={item.key}
                          to={`/myclub/${clubId}${item.url}`}
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
                )}

                {/* Teams */}
                <div>
                  <div className="px-3 mb-4">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Phòng ban
                    </h2>
                  </div>

                  {/* Nút tạo phòng ban: CHỈ hiển thị khi là CLUB_OFFICER */}
                  {isClubOfficer && (
                    <div className="px-3 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center border-dashed"
                        onClick={() =>
                          navigate(`/myclub/${clubId}/teams/create`)
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo phòng ban
                      </Button>
                    </div>
                  )}

                  {teamsLoading && (
                    <p className="px-3 text-xs text-muted-foreground">
                      Đang tải…
                    </p>
                  )}
                  {teamsError && (
                    <p className="px-3 text-xs text-red-600">
                      {String(teamsError)}
                    </p>
                  )}

                  {teams?.map((team) => {
                    const base = `/myclub/${clubId}/teams/${team.teamId}`;
                    return (
                      <NavLink
                        key={team.teamId}
                        to={base}
                        end
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            isActive
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-foreground hover:bg-secondary"
                          }`
                        }
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold">
                          {team.teamName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 truncate">{team.teamName}</div>
                        <span className="text-[10px] text-muted-foreground">
                          {team.memberCount}
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              </nav>
            </aside>

            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </TooltipProvider>
    </PermissionContext.Provider>
  );
};
