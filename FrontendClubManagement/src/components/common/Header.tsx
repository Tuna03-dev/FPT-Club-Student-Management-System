import type React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { authService, type UserInfo } from "@/services/authService";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Users, LogOut, Shield } from "lucide-react";

// Mock data for clubs
const mockClubs = [
  {
    clubId: 1,
    clubName: "CLB HÍT HÀ DRAMA FU 2.0",
    logoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%2348a9f0'/%3E%3Cpath d='M30 50 L50 30 L70 50 L50 70 Z' fill='white'/%3E%3C/svg%3E",
  },
  {
    clubId: 2,
    clubName: "FU - Hòa Lạc",
    logoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23ff69b4'/%3E%3Ctext x='50' y='60' font-size='36' font-weight='bold' text-anchor='middle' fill='white'%3E2025%3C/text%3E%3C/svg%3E",
  },
  {
    clubId: 3,
    clubName: "DỊCH VỤ SUPPORT COURSERA và UDEMY-OFFICIAL OPEN SOURCE...",
    logoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23ffd700'/%3E%3Ccircle cx='25' cy='50' r='15' fill='%23ff69b4'/%3E%3Ccircle cx='50' cy='50' r='15' fill='%23ffff00'/%3E%3Ccircle cx='75' cy='50' r='15' fill='%2348a9f0'/%3E%3C/svg%3E",
  },
  {
    clubId: 4,
    clubName: "FUOverflow | Cộng đồng sinh viên Đại",
    logoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23a855f7'/%3E%3Ctext x='50' y='60' font-size='32' font-weight='bold' text-anchor='middle' fill='white'%3EJO%3C/text%3E%3C/svg%3E",
  },
];

const Header: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showClubsList, setShowClubsList] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser();
      const authenticated = authService.isAuthenticated();
      setUser(currentUser);
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    // Listen for storage changes (e.g., when user logs in/out in another tab)
    window.addEventListener("storage", checkAuth);

    // Listen for custom auth state change events (for same-tab updates)
    const handleAuthChange = () => {
      checkAuth();
    };
    window.addEventListener("auth-state-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-state-changed", handleAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logoutWithApi();
      setUser(null);
      setIsAuthenticated(false);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, clear local state and redirect
      setUser(null);
      setIsAuthenticated(false);
      navigate("/");
    }
  };

  const isAdmin =
    user?.systemRole === "ADMIN" || user?.systemRole === "MANAGER";

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white shadow sticky top-0 z-40">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/Logo_Trường_Đại_học_FPT.svg"
              alt="FPT"
              className="h-10"
            />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-orange-600">
                TỔ CHỨC GIÁO DỤC FPT
              </div>
              <div className="text-xs text-gray-500">Clubs & Events</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Trang chủ
            </Link>
            <Link
              to="/clubs"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Câu lạc bộ
            </Link>
            <Link
              to="/myclub/select"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              CLB của tôi
            </Link>
            <Link
              to="/events"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Sự kiện
            </Link>

            <Link
              to="/news"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Tin tức
            </Link>
            <Link
              to="/about"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Giới thiệu
            </Link>
          </nav>

          <div className="flex items-center gap-4 ">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group flex items-center gap-3 hover:bg-orange-50 transition-colors rounded-lg p-2 cursor-pointer">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-gray-700 group-hover:text-orange-600 font-medium transition-colors">
                      {user.fullName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[32rem] overflow-y-auto">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
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
                        <User className="mr-2 h-4 w-4" />
                        <span>Thông tin cá nhân</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowClubsList(true)}
                        onSelect={(e) => e.preventDefault()}
                        className="cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span>Câu lạc bộ của tôi</span>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => navigate("/admin")}
                          className="cursor-pointer"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Trang quản trị</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-red-600 "
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Đăng xuất</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => setShowClubsList(false)}
                        onSelect={(e) => e.preventDefault()}
                        className="cursor-pointer"
                      >
                        <span className="text-xs text-gray-500">← Quay lại</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="px-3 py-2 text-base font-semibold">
                        Lối tắt của bạn
                      </DropdownMenuLabel>
                      {mockClubs.map((club) => (
                        <DropdownMenuItem
                          key={club.clubId}
                          onClick={() => navigate(`/myclub/${club.clubId}`)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-3 w-full">
                            {club.logoUrl ? (
                              <img
                                src={club.logoUrl}
                                alt={club.clubName}
                                className="h-10 w-10 rounded-md flex-shrink-0 object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-sm">
                                  {club.clubName.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className="text-sm truncate flex-1">
                              {club.clubName}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-block bg-transparent border border-orange-500 text-orange-500 px-4 py-2 rounded-md font-medium hover:bg-orange-50 text-center"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
