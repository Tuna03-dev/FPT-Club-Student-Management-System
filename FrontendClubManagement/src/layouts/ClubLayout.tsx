// src/layouts/ClubLayout.tsx
import {
  Home,
  Users,
  Calendar,
  Search,
  Menu,
  Shield,
  FileText,
  Briefcase,
  DollarSign,
  Wallet,
  Plus,
  Newspaper,
  X,
  ClipboardList,
  User,
  LogOut,
  Building2,
  PlusCircle,
  FileSignature,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect, useRef } from "react";
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
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useWebSocket, type EventWebSocketPayload } from "@/hooks/useWebSocket";

const navItems = [
  { key: "dashboard", url: "", icon: Home },
  { key: "members", url: "/members", icon: Users },
  { key: "events", url: "/events", icon: Calendar },
  { key: "payments", url: "/payments", icon: Wallet },
];

type PermissionLevel =
  | "CLUB_OFFICER"
  | "CLUB_TREASURER"
  | "TEAM_OFFICER"
  | "MEMBER";

interface ManagementItem {
  key: string;
  url: string | ((clubId: string | number, teamId?: number | null) => string);
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiredRole: PermissionLevel;
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
    label: "Quản lý vai trò",
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
    key: "team_news",
    url: (clubId: string | number, teamId?: number | null) =>
      `/myclub/${clubId}/teams/${teamId}/team-news`,
    icon: FileText,
    label: "Tin tức phòng ban",
    requiredRole: "TEAM_OFFICER",
  },
  {
    key: "manage_members",
    url: "/members",
    icon: Users,
    label: "Danh sách thành viên",
    requiredRole: "MEMBER",
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
    requiredRole: "CLUB_TREASURER",
  },
  {
    key: "manage_information",
    url: "/information",
    icon: ClipboardList,
    label: "Thông tin câu lạc bộ",
    requiredRole: "MEMBER",
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
  manage_information: "bg-gradient-to-br from-indigo-500 to-indigo-600",
  team_news: "bg-gradient-to-br from-cyan-500 to-cyan-600",
};

export const ClubLayout = () => {
  const { t } = useTranslation("common");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showClubsList, setShowClubsList] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { clubId = "0" } = useParams();
  const numericClubId = Number(clubId);
  const validClubId = Number.isFinite(numericClubId) && numericClubId > 0;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || null
      : null;

  const { isConnected, subscribeToClub } = useWebSocket(token);

  const shouldLoadMyClubs = isAuthenticated && !!user;
  const {
    data: clubs,
    loading: clubsLoading,
    error: clubsError,
  } = useMyClubs(shouldLoadMyClubs);

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser();
      const authenticated = authService.isAuthenticated();
      setUser(currentUser);
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-state-changed", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-state-changed", checkAuth);
    };
  }, []);

  const {
    data: teams,
    loading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams,
  } = useTeams(validClubId ? numericClubId : undefined);

  const myTeam = useMemo(() => {
    if (!teams) return null;

    const leadTeam = teams.find((t) =>
      t.myRoles?.some(
        (r) => r.toUpperCase().includes("LEADER") || r.includes("Trưởng ban")
      )
    );
    if (leadTeam) return leadTeam;

    const officerTeam = teams.find((t) =>
      t.myRoles?.some((role) =>
        ["OFFICER", "TEAM_OFFICER", "VICE_LEADER", "VICE"].some((k) =>
          role.toUpperCase().includes(k)
        )
      )
    );
    return officerTeam ?? null;
  }, [teams]);

  useEffect(() => {
    if (!validClubId || !isConnected) return;

    const off = subscribeToClub(numericClubId, (msg) => {
      if (msg.type === "TEAM") {
        if (
          msg.action === "CREATED" ||
          msg.action === "UPDATED" ||
          msg.action === "DELETED"
        ) {
          refetchTeams();
        }
        return;
      }

      if (msg.type === "EVENT") {
        const payload = msg.payload as EventWebSocketPayload;
        if (msg.action === "MEETING_CREATED") {
          toast.success("CLB có buổi meeting mới", {
            description:
              payload.message ||
              `Buổi meeting "${payload.eventTitle}" vừa được tạo.`,
          });
        }
        return;
      }
      if (msg.type !== "TEAM") return;
      if (
        msg.action === "CREATED" ||
        msg.action === "UPDATED" ||
        msg.action === "DELETED"
      ) {
        refetchTeams();
      }
    });

    return () => {
      off?.();
    };
  }, [validClubId, numericClubId, isConnected, subscribeToClub, refetchTeams]);
  useEffect(() => {
    if (!validClubId) return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail?.clubId === numericClubId) {
        refetchTeams();
      }
    };

    window.addEventListener("team-created", handler as EventListener);
    window.addEventListener("team-deleted", handler as EventListener);

    return () => {
      window.removeEventListener("team-created", handler as EventListener);
      window.removeEventListener("team-deleted", handler as EventListener);
    };
  }, [validClubId, numericClubId, refetchTeams]);

  const {
    isClubOfficer,
    isTeamOfficer,
    isClubTreasurer,
    loading: permissionsLoading,
  } = useClubPermissions(validClubId ? numericClubId : undefined);

  if (myTeam?.teamId && validClubId) {
    const key = `firstTeamId:${numericClubId}`;
    try {
      const prev = sessionStorage.getItem(key);
      const prevVal = prev ? JSON.parse(prev)?.value : undefined;
      // if (prevVal !== teams[0].teamId) {
      //   sessionStorage.setItem(
      //     key,
      //     JSON.stringify({ value: teams[0].teamId, at: Date.now() })
      //   );
      // }
      if (prevVal !== myTeam.teamId) {
        sessionStorage.setItem(
          key,
          JSON.stringify({ value: myTeam.teamId, at: Date.now() })
        );
      }
    } catch {}
  }

  const userRoleLevel: PermissionLevel = useMemo(() => {
    if (permissionsLoading) return "MEMBER";
    if (isClubOfficer) return "CLUB_OFFICER";
    if (isClubTreasurer) return "CLUB_TREASURER";
    if (isTeamOfficer) return "TEAM_OFFICER";
    return "MEMBER";
  }, [isClubOfficer, isClubTreasurer, isTeamOfficer, permissionsLoading]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) {
      setSearchInput(q);
    } else {
      setSearchInput("");
    }
  }, [location.search]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }

      const newSearch = params.toString();
      const targetPath = `/myclub/${clubId}`;
      const currentPath = location.pathname;

      if (currentPath !== targetPath) {
        navigate(`${targetPath}?${newSearch}`);
      } else {
        navigate(`${targetPath}?${newSearch}`, { replace: true });
      }
    }, 500);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const params = new URLSearchParams(location.search);
    params.delete("q");
    const newSearch = params.toString();
    const targetPath = `/myclub/${clubId}`;

    if (location.pathname === targetPath) {
      navigate(`${targetPath}${newSearch ? "?" + newSearch : ""}`, {
        replace: true,
      });
    }
  };

  const filteredManagementItems = useMemo(() => {
    if (permissionsLoading) return [];

    const roleHierarchy: Record<PermissionLevel, number> = {
      CLUB_OFFICER: 4,
      CLUB_TREASURER: 3,
      TEAM_OFFICER: 2,
      MEMBER: 1,
    };

    return managementItems
      .filter((item) => {
        if (item.key === "manage_finance") {
          return isClubTreasurer || isClubOfficer;
        }
        if (item.key === "team_news") {
          return isTeamOfficer;
        }

        if (item.requiredRole === "TEAM_OFFICER") {
          return (
            roleHierarchy[userRoleLevel] >= roleHierarchy[item.requiredRole] ||
            isClubTreasurer ||
            isClubOfficer
          );
        }

        return roleHierarchy[userRoleLevel] >= roleHierarchy[item.requiredRole];
      })
      .map((item) => {
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
  }, [userRoleLevel, permissionsLoading, isClubTreasurer, isClubOfficer]);

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
                    type="text"
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={t("search")}
                    className="pl-9 pr-8 h-9 bg-secondary/50 border-0"
                  />
                  {searchInput && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Center NAV — FIXED teamId */}
              <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-[600px]">
                {navItems.map((item) => (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={
                          typeof item.url === "function"
                            ? (
                                item.url as (
                                  clubId: string | number,
                                  teamId?: number | null
                                ) => string
                              )(clubId, myTeam?.teamId ?? null) // 🔥 FIX HERE
                            : `/myclub/${clubId}${item.url}`
                        }
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
                  className="hidden sm:flex items-center gap-2 hover:bg-orange-50 transition"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-600">Trang chủ</span>
                </Button>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-orange-50 transition">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={user?.avatarUrl}
                          alt={user?.fullName}
                        />
                        <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                          {user ? getInitials(user.fullName) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-[15px] font-medium text-gray-700 group-hover:text-orange-600 max-w-[120px] truncate">
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
                        <p className="text-[13px] text-gray-500">
                          {user?.email}
                        </p>
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
                          onClick={() => navigate("/create-club")}
                          className="cursor-pointer text-[14px] text-gray-700"
                        >
                          <PlusCircle className="mr-2 h-4 w-4 text-orange-500" />
                          Đăng ký thành lập CLB
                        </DropdownMenuItem>

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
                            {clubsError}
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

                {/* Mobile menu — FIXED ROUTE */}
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
                        {userRoleLevel === "CLUB_OFFICER" ||
                        userRoleLevel === "CLUB_TREASURER" ||
                        userRoleLevel === "TEAM_OFFICER"
                          ? "QUẢN LÝ"
                          : "DANH MỤC"}
                      </h3>

                      {filteredManagementItems.map((item) => (
                        <DropdownMenuItem key={item.key} asChild>
                          <NavLink
                            to={
                              typeof item.url === "function"
                                ? item.url(
                                    clubId,
                                    myTeam?.teamId ??
                                      teams?.find(
                                        (t) => t.myRoles && t.myRoles.length > 0
                                      )?.teamId ??
                                      null
                                  ) // 🔥 FIX HERE
                                : `/myclub/${clubId}${item.url}`
                            }
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
                        {userRoleLevel === "CLUB_OFFICER" ||
                        userRoleLevel === "CLUB_TREASURER" ||
                        userRoleLevel === "TEAM_OFFICER"
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
                          to={
                            typeof item.url === "function"
                              ? item.url(clubId, myTeam?.teamId) // 🔥 FIX HERE
                              : `/myclub/${clubId}${item.url}`
                          }
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
