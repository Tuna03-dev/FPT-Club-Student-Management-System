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
import useMyClubs from "@/hooks/useMyClubs";

const Header: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showClubsList, setShowClubsList] = useState(false);
  const navigate = useNavigate();

  const { data: clubs, loading: clubsLoading, error: clubsError } = useMyClubs();

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

  const handleLogout = async () => {
    try {
      await authService.logoutWithApi();
    } catch {}
    setUser(null);
    setIsAuthenticated(false);
    navigate("/");
  };

  const isAdmin =
    user?.systemRole === "ADMIN" || user?.systemRole === "MANAGER";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/Logo_Trường_Đại_học_FPT.svg"
              alt="FPT"
              className="h-10"
            />
            <div className="hidden sm:block leading-tight">
              <div className="text-[14px] font-semibold text-orange-600">
                TỔ CHỨC GIÁO DỤC FPT
              </div>
              <div className="text-[12px] text-gray-500">Clubs & Events</div>
            </div>
          </Link>

          {/* Navbar */}
          <nav className="hidden md:flex items-center gap-7">
            {[
              { path: "/", label: "Trang chủ" },
              { path: "/clubs", label: "Câu lạc bộ" },
              { path: "/myclub/select", label: "CLB của tôi" },
              { path: "/events", label: "Sự kiện" },
              { path: "/news", label: "Tin tức" },
              { path: "/about", label: "Giới thiệu" },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-[15px] font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Avatar / Login */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-orange-50 transition">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                      <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-[15px] font-medium text-gray-700 group-hover:text-orange-600">
                      {user.fullName}
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
                        {user.fullName}
                      </p>
                      <p className="text-[13px] text-gray-500">{user.email}</p>
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

                      {/* Hiển thị “Câu lạc bộ của tôi” chỉ khi có CLB */}
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

                      {/* Trạng thái tải */}
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

                      {/* Danh sách CLB thực tế */}
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
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-block border border-orange-500 text-orange-500 text-[14px] px-4 py-1.5 rounded-md font-medium hover:bg-orange-50 transition"
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
