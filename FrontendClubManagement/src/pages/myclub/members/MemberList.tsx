import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Users,
  Search,
  Eye,
  Award,
  Calendar,
  Shield,
  Mail,
  Phone,
  UserX,
  UserCheck,
  UserCog,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberDetailDialog from "@/components/member/MemberDetailDialog";
import {
  memberService,
  type MemberResponseDTO,
} from "@/services/memberService";
import {
  clubService,
  type SemesterDTO,
  type ClubRoleDTO,
  type TeamDTO,
} from "@/services/clubService";
import { authService } from "@/services/authService";
import { type PageResponse } from "@/types";

import { toast } from "sonner";

// API paging + data state
type MembersPage = PageResponse<MemberResponseDTO>;

const statusToLabel = (status?: boolean) => {
  switch (status) {
    case true:
      return "Hoạt động";
    case false:
      return "Tạm nghỉ";
    default:
      return "Tạm nghỉ";
  }
};

// Safely derive role info to display from currentTerm, else fallback to latest history
const getDisplayRoleInfo = (
  member: MemberResponseDTO
): { roleName: string; roleLevel: number } | null => {
  const current = member.currentTerm as unknown as
    | {
        roleName?: string;
        roleLevel?: number;
        isActive?: boolean;
      }
    | undefined;
  if (current && current.roleName && current.isActive !== false) {
    return {
      roleName: current.roleName,
      roleLevel: current.roleLevel ?? 999,
    };
  }
  const history = (member.history || []) as Array<{
    roleName?: string;
    roleLevel?: number;
    isActive?: boolean;
  }>;
  if (history.length > 0) {
    const recentWithRole = history.find(
      (h) => h && h.roleName && h.isActive !== false
    );
    if (recentWithRole?.roleName) {
      return {
        roleName: recentWithRole.roleName,
        roleLevel: recentWithRole.roleLevel ?? 999,
      };
    }
    const anyWithRole = history.find((h) => h && h.roleName);
    if (anyWithRole?.roleName) {
      return {
        roleName: anyWithRole.roleName,
        roleLevel: anyWithRole.roleLevel ?? 999,
      };
    }
  }
  return null;
};

const getRoleColorByLevel = (roleLevel?: number): string => {
  const level = roleLevel ?? 999;
  if (level === 1) return "bg-primary/10 text-primary border-primary/20"; // Chủ tịch
  if (level === 2)
    return "bg-purple-500/10 text-purple-600 border-purple-500/20"; // Phó chủ tịch
  if (level === 3) return "bg-blue-500/10 text-blue-600 border-blue-500/20"; // Trưởng ban/ban officer
  if (level === 4) return "bg-sky-500/10 text-sky-600 border-sky-500/20"; // Core member
  if (level >= 5) return "bg-muted text-muted-foreground border-muted"; // Member/others
  return "bg-muted text-muted-foreground border-muted";
};

const Members = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { clubId: clubIdParam } = useParams();

  // Get club ID from route params
  const clubId = Number(clubIdParam);

  // Check if user is officer from localStorage
  const isOfficer = useMemo(() => {
    const user = authService.getCurrentUser();
    if (!user || !user.clubRoleList) return false;

    const clubRole = user.clubRoleList.find((r) => r.clubId === clubId);
    return clubRole?.systemRole === "CLUB_OFFICER";
  }, [clubId]);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const prevFiltersRef = useRef({ searchQuery: "", selectedTerm: "", selectedRole: "all", selectedStatus: "active" });
  const [selectedMember, setSelectedMember] =
    useState<MemberResponseDTO | null>(null);
  const [page, setPage] = useState(0); // 0-based
  const size = 10;
  const [loading, setLoading] = useState(true);
  const [membersPage, setMembersPage] = useState<MembersPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<SemesterDTO[]>([]);
  const [clubRoles, setClubRoles] = useState<ClubRoleDTO[]>([]);
  const [teams, setTeams] = useState<TeamDTO[]>([]);

  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [selectedMemberRole, setSelectedMemberRole] = useState<string>("");
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isAssignTeamOpen, setIsAssignTeamOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"current" | "left">("current");
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Left members state
  const [leftMembersPage, setLeftMembersPage] = useState<MembersPage | null>(
    null
  );
  const [leftMembersLoading, setLeftMembersLoading] = useState(false);
  const [leftMembersError, setLeftMembersError] = useState<string | null>(null);
  const [leftMembersSearchQuery, setLeftMembersSearchQuery] = useState("");
  const debouncedLeftMembersSearch = useDebounce(leftMembersSearchQuery, 500);
  const [leftMembersPageNum, setLeftMembersPageNum] = useState(0);

  // Function to update URL params (stable)
  const updateUrlParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value === "") {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
        } else {
          newParams.delete(key);
        }
      });

      if (!Object.prototype.hasOwnProperty.call(updates, "semester")) {
        if (!newParams.has("semester") && selectedTerm !== "") {
          newParams.set("semester", selectedTerm);
        }
      }

      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams, selectedTerm]
  );

  // Sync states with URL params changes (e.g., browser back/forward)
  useEffect(() => {
    const query = searchParams.get("search") || "";
    const term = searchParams.get("semester") || "";
    const role = searchParams.get("role") || "all";
    const status = searchParams.get("status") || "active";

    setSearchQuery(query);
    setSelectedTerm(term);
    setSelectedRole(role);
    setSelectedStatus(status);
  }, [searchParams]);

  // Initial load: Fetch semesters first (needed for default filter), then load members immediately
  // Roles and teams are lazy loaded when needed (for officers only)
  useEffect(() => {
    // Load semesters, roles, teams in background (không block members)
    const loadInitialData = async () => {
      try {
        const semestersRes = await clubService.getSemesters(clubId);
        if (semestersRes.code === 200 && semestersRes.data) {
          setSemesters(semestersRes.data);
          // Set default current semester only if no selection in URL/state
          const params = new URLSearchParams(window.location.search);
          if (!params.get("semester")) {
            const currentSemester = semestersRes.data.find((semester) => semester.isCurrent);
            if (currentSemester) {
              const termId = currentSemester.id.toString();
              setSelectedTerm(termId);
            }
          }
        }
        // Lazy load roles and teams in background (only needed for officers)
        if (isOfficer) {
          Promise.all([
            clubService.getRoles(clubId),
            clubService.getTeams(clubId),
          ]).then(([rolesRes, teamsRes]) => {
            if (rolesRes.code === 200 && rolesRes.data) {
              setClubRoles(rolesRes.data);
            }
            if (teamsRes.code === 200 && teamsRes.data) {
              setTeams(teamsRes.data);
            }
          }).catch((e) => {
            console.error("Error fetching roles/teams:", e);
          });
        }
      } catch (e: unknown) {
        console.error("Error fetching initial data:", e);
      }
    };
    loadInitialData();
  }, [clubId, isOfficer]);

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed = 
      prev.searchQuery !== debouncedSearchQuery ||
      prev.selectedTerm !== selectedTerm ||
      prev.selectedRole !== selectedRole ||
      prev.selectedStatus !== selectedStatus;
    
    if (changed) {
      prevFiltersRef.current = { 
        searchQuery: debouncedSearchQuery, 
        selectedTerm, 
        selectedRole, 
        selectedStatus 
      };
      setPage(0);
    }
  }, [debouncedSearchQuery, selectedTerm, selectedRole, selectedStatus]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await memberService.getMembers(clubId, {
        page,
        size,
        searchTerm: debouncedSearchQuery || undefined,
        status: undefined, // Not used; using isActive instead
        semesterId: selectedTerm ? parseInt(selectedTerm) : undefined,
        roleId: selectedRole !== "all" ? parseInt(selectedRole) : undefined,
        isActive: selectedStatus === "active" ? true : false,
      });

      if (res.code === 200 && res.data) {
        setMembersPage(res.data);
      } else {
        const message = res.message || "Không thể tải danh sách thành viên";
        setError(message);
        toast.error(message);
      }
    } catch (e: unknown) {
      console.error("Error fetching members:", e);
      const message = "Có lỗi khi tải danh sách thành viên";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    size,
    debouncedSearchQuery,
    selectedTerm,
    selectedRole,
    selectedStatus,
    clubId,
  ]);

  const loadLeftMembers = useCallback(async () => {
    setLeftMembersLoading(true);
    setLeftMembersError(null);
    try {
      const res = await memberService.getLeftMembers(clubId, {
        page: leftMembersPageNum,
        size,
        searchTerm: debouncedLeftMembersSearch || undefined,
      });

      if (res.code === 200 && res.data) {
        setLeftMembersPage(res.data);
      } else {
        const message =
          res.message || "Không thể tải danh sách thành viên đã rời";
        setLeftMembersError(message);
        toast.error(message);
      }
    } catch (e: unknown) {
      console.error("Error fetching left members:", e);
      const message = "Có lỗi khi tải danh sách thành viên đã rời";
      setLeftMembersError(message);
      toast.error(message);
    } finally {
      setLeftMembersLoading(false);
    }
  }, [leftMembersPageNum, size, debouncedLeftMembersSearch, clubId]);

  const clearFilters = useCallback(() => {
    // Remove params from URL and reset local filters to defaults
    updateUrlParams({
      semester: undefined,
      role: undefined,
      status: undefined,
      search: undefined,
    });
    const current = semesters.find((s) => s.isCurrent);
    console.log("Current semester on clear:", current);
    if (current) setSelectedTerm(current.id.toString());
    else setSelectedTerm("");
    setSelectedRole("all");
    setSelectedStatus("active");
    setSearchQuery("");
    setPage(0);
    // trigger reload
    loadMembers();
  }, [semesters, loadMembers, updateUrlParams]);

  // Fetch members when page or filters change
  // Fetch members when page or filters change
  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    debouncedSearchQuery,
    selectedTerm,
    selectedRole,
    selectedStatus,
  ]);

  // Fetch left members when tab changes or filters change
  useEffect(() => {
    if (activeTab === "left") {
      loadLeftMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leftMembersPageNum, debouncedLeftMembersSearch]);

  const filteredMembers = useMemo(() => {
    // Server-side filtering is now handled by the API
    return membersPage?.content ?? [];
  }, [membersPage]);

  const filteredLeftMembers = useMemo(() => {
    // Server-side filtering is now handled by the API
    return leftMembersPage?.content ?? [];
  }, [leftMembersPage]);

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      "Hoạt động": "bg-green-500/10 text-green-600 border-green-500/20",
      "Tạm nghỉ": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    };
    return (
      statusColors[status] || "bg-muted text-muted-foreground border-muted"
    );
  };

  const handleSaveRole = async () => {
    if (!selectedMemberRole || !selectedMember) {
      toast.error("Vui lòng chọn vai trò");
      return;
    }

    try {
      const roleId = parseInt(selectedMemberRole);
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        toast.error("Không xác định người dùng hiện tại");
        return;
      }
      const currentUserId = currentUser.id;
      await memberService.changeRole(
        clubId,
        selectedMember.userId,
        roleId,
        currentUserId
      );
      toast.success("Cập nhật vai trò thành công");
      setIsEditRoleOpen(false);
      // Refresh the member list
      loadMembers();
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật vai trò thất bại");
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedMember) return;

    const willBeActive = !(selectedMember.currentTerm?.isActive === true);
    const confirm = window.confirm(
      `Bạn có chắc muốn ${
        willBeActive ? "kích hoạt" : "tạm ngưng"
      } thành viên này?`
    );
    if (!confirm) return;

    try {
      await memberService.changeStatus(
        clubId,
        selectedMember.userId,
        willBeActive,
        { semesterId: selectedTerm ? parseInt(selectedTerm) : undefined }
      );
      toast.success("Cập nhật trạng thái thành công");
      setIsChangeStatusOpen(false);
      loadMembers();
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật trạng thái thất bại");
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    const confirm = window.confirm(
      "Bạn có chắc muốn đá thành viên này khỏi CLB? Hành động không thể hoàn tác."
    );
    if (!confirm) return;

    try {
      await memberService.removeMember(clubId, selectedMember.userId);
      toast.success("Đã đánh dấu thành viên rời CLB");
      setIsRemoveOpen(false);
      setSelectedMember(null);
      loadMembers();
    } catch (err) {
      console.error(err);
      toast.error("Xóa thành viên thất bại");
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedTeam || !selectedMember) {
      toast.error("Vui lòng chọn ban");
      return;
    }

    try {
      const teamId = parseInt(selectedTeam);
      await memberService.assignTeam(clubId, selectedMember.userId, teamId);
      toast.success("Phân ban thành công");
      setIsAssignTeamOpen(false);
      loadMembers();
    } catch (err) {
      console.error(err);
      toast.error("Phân ban thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-primary/5">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-card/80 backdrop-blur-sm p-6 rounded-2xl border border-primary/10 shadow-medium">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-glow blur-xl opacity-50 rounded-full"></div>
              <div className="relative p-4 rounded-2xl bg-primary shadow-glow">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                {isOfficer ? "Quản lý thành viên" : "Danh sách thành viên"}
              </h1>
              {!isOfficer && (
                <p className="text-sm text-muted-foreground mt-1">
                  Xem thông tin các thành viên trong CLB
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Import Excel Button - Only for officers */}
            {isOfficer && (
              <Button
                onClick={() => setIsImportExcelOpen(true)}
                className="gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import từ Excel</span>
                <span className="sm:hidden">Import</span>
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">CLB FPT</span>
            </div>
          </div>
        </div>

        {/* Info banner for regular members */}
        {!isOfficer && (
          <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">
                    Chế độ xem thành viên
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Bạn có thể xem thông tin cơ bản của các thành viên trong
                    CLB. Chỉ Chủ nhiệm và Phó Chủ nhiệm mới có quyền quản lý và
                    chỉnh sửa thông tin thành viên.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value: string) => {
            setActiveTab(value as "current" | "left");
            setPage(0);
            setSearchQuery("");
            setSelectedStatus("active");
            setSelectedRole("all");
            // Reset left members state when switching tabs
            if (value === "left") {
              setLeftMembersPageNum(0);
              setLeftMembersSearchQuery("");
            }
          }}
          className="mb-6"
        >
          {isOfficer ? (
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="current" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Thành viên hiện tại
              </TabsTrigger>
              <TabsTrigger value="left" className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Đã rời CLB
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full max-w-md grid-cols-1">
              <TabsTrigger value="current" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Thành viên hiện tại
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="current" className="space-y-6 mt-6">
            {/* Filters */}
            <Card className="border-primary/20 shadow-medium bg-card/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                {isOfficer ? (
                  // Full filters for officers
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm theo tên, email..."
                        value={searchQuery}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchQuery(value);
                          updateUrlParams({ search: value || undefined });
                        }}
                        className="pl-10 border-primary/20 focus:border-primary"
                      />
                    </div>

                    <Select
                      value={selectedTerm}
                      onValueChange={(value) => {
                        if (!value) {
                          const current = semesters.find((s) => s.isCurrent);
                          const termId = current ? current.id.toString() : "";
                          setSelectedTerm(termId);
                          updateUrlParams({
                            semester: termId === "" ? undefined : termId,
                          });
                        } else {
                          setSelectedTerm(value);
                          updateUrlParams({ semester: value });
                        }
                      }}
                    >
                      <SelectTrigger className="border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {semesters.map((semester) => (
                          <SelectItem
                            key={semester.id}
                            value={semester.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <span>{semester.semesterName}</span>
                              {semester.isCurrent && (
                                <Badge variant="outline" className="text-xs">
                                  Hiện tại
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedRole}
                      onValueChange={(value) => {
                        setSelectedRole(value);
                        updateUrlParams({
                          role: value === "all" ? undefined : value,
                        });
                      }}
                    >
                      <SelectTrigger className="border-primary/20">
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả vai trò</SelectItem>
                        {clubRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{role.roleName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedStatus}
                      onValueChange={(value) => {
                        setSelectedStatus(value);
                        updateUrlParams({
                          status: value === "" ? undefined : value,
                        });
                      }}
                    >
                      <SelectTrigger className="border-primary/20">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Đang hoạt động</SelectItem>
                        <SelectItem value="inactive">Tạm nghỉ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  // Simple search for members
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm theo tên, email..."
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchQuery(value);
                        updateUrlParams({ search: value || undefined });
                      }}
                      className="pl-10 border-primary/20 focus:border-primary"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Members List */}
            <div className="space-y-4">
              {loading && (
                <>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card
                      key={index}
                      className="border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden relative"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
              {error && (
                <Card className="border-destructive/20 bg-card/80 backdrop-blur-sm p-6">
                  <CardContent>
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-destructive font-semibold">
                        {error}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Thử lại hoặc đặt lại bộ lọc để xem kết quả khác.
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => loadMembers()} variant="outline">
                          Thử lại
                        </Button>
                        <Button onClick={() => clearFilters()}>
                          Đặt lại bộ lọc
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {!loading && !error && filteredMembers.length === 0 && (
                <Card className="border-primary/20 bg-card/80 backdrop-blur-sm p-6">
                  <CardContent>
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          Không có thành viên nào phù hợp
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Thử thay đổi bộ lọc hoặc đặt lại để hiển thị tất cả
                          thành viên.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => clearFilters()}
                          variant="outline"
                        >
                          Đặt lại bộ lọc
                        </Button>
                        <Button onClick={() => loadMembers()}>Tải lại</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {!loading &&
                !error &&
                filteredMembers.map((member) => (
                  <Card
                    key={`${member.userId}-${member.studentCode}`}
                    className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-glow hover:scale-[1.01] group bg-card/80 backdrop-blur-sm overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <CardContent className=" relative z-10">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Member Info */}
                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-glow blur-md opacity-20 rounded-full"></div>
                            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-primary/30 relative">
                              <AvatarImage
                                src={member.avatarUrl}
                                alt={member.fullName}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                                {member.fullName.split(" ").pop()?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold">
                                {member.fullName}
                              </h3>
                              <span className="text-sm text-muted-foreground">
                                {member.studentCode}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              {getDisplayRoleInfo(member) && (
                                <Badge
                                  className={getRoleColorByLevel(
                                    getDisplayRoleInfo(member)?.roleLevel
                                  )}
                                >
                                  {getDisplayRoleInfo(member)?.roleName}
                                </Badge>
                              )}

                              <Badge
                                className={getStatusColor(
                                  statusToLabel(member.currentTerm?.isActive)
                                )}
                              >
                                {statusToLabel(member.currentTerm?.isActive)}
                              </Badge>
                              {/* Team Badge */}
                              {member.currentTerm?.teamName && (
                                <Badge
                                  variant="outline"
                                  className="border-orange-500/30 text-orange-600"
                                >
                                  {member.currentTerm.teamName}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{member.email}</span>
                              </div>
                              {member.phoneNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{member.phoneNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 sm:gap-6 flex-wrap lg:flex-nowrap">
                          
                          <div className="hidden sm:block text-center p-3 rounded-xl bg-secondary/50 border border-border min-w-[90px]">
                            <div className="text-sm font-medium flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {member.joinDate}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tham gia
                            </div>
                          </div>

                          {isOfficer && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-glow transition-all"
                                onClick={() => setSelectedMember(member)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">
                                  Xem chi tiết
                                </span>
                                <span className="sm:hidden">Chi tiết</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Pagination Summary + Controls */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Trang{" "}
                  <span className="font-semibold text-primary">{page + 1}</span>{" "}
                  /{" "}
                  <span className="font-medium">
                    {membersPage?.totalPages ?? 1}
                  </span>
                </div>
                <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary-700 font-semibold text-sm">
                  {membersPage?.totalElements ?? 0} thành viên
                </div>
              </div>
              <div />
            </div>

            {membersPage && membersPage.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        size="default"
                        onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                        className={
                          page === 0
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from(
                      { length: membersPage.totalPages },
                      (_, i) => i
                    ).map((pageNum) => {
                      if (
                        pageNum === 0 ||
                        pageNum === membersPage.totalPages - 1 ||
                        (pageNum >= page - 1 && pageNum <= page + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              size="default"
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum + 1}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (pageNum === page - 2 || pageNum === page + 2) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext
                        size="default"
                        onClick={() =>
                          setPage((prev) =>
                            Math.min(membersPage.totalPages - 1, prev + 1)
                          )
                        }
                        className={
                          page >= membersPage.totalPages - 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          <TabsContent value="left" className="space-y-6 mt-6">
            {/* Left Members Filters */}
            <Card className="border-red-500/20 shadow-medium bg-card/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm theo tên, mã sinh viên..."
                      value={leftMembersSearchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setLeftMembersSearchQuery(value);
                        setLeftMembersPageNum(0); // Reset to first page when searching
                      }}
                      className="pl-10 border-red-500/20 focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLeftMembersSearchQuery("");
                        setLeftMembersPageNum(0);
                      }}
                      className="border-red-500/20 hover:bg-red-500/10"
                    >
                      Xóa bộ lọc
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Left Members List */}
            <div className="space-y-4">
              {leftMembersLoading && (
                <>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card
                      key={index}
                      className="border-red-500/20 bg-card/80 backdrop-blur-sm overflow-hidden relative"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Member Info Skeleton */}
                          <div className="flex items-start gap-3 sm:gap-4 flex-1">
                            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                                <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                              </div>
                            </div>
                          </div>

                          {/* Stats Skeleton */}
                          <div className="flex items-center gap-3 sm:gap-6 flex-wrap lg:flex-nowrap">
                            <div className="h-16 w-16 rounded-xl bg-muted animate-pulse" />
                            <div className="h-16 w-20 rounded-xl bg-muted animate-pulse" />
                            <div className="h-16 w-24 rounded-xl bg-muted animate-pulse" />
                            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {leftMembersError && (
                <Card className="border-destructive/20 bg-card/80 backdrop-blur-sm p-6">
                  <CardContent>
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-destructive font-semibold">
                        {leftMembersError}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Thử lại hoặc đặt lại bộ lọc để xem kết quả khác.
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => loadLeftMembers()}
                          variant="outline"
                        >
                          Thử lại
                        </Button>
                        <Button
                          onClick={() => {
                            setLeftMembersSearchQuery("");
                            setLeftMembersPageNum(0);
                          }}
                        >
                          Đặt lại bộ lọc
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!leftMembersLoading &&
                !leftMembersError &&
                filteredLeftMembers.length === 0 && (
                  <Card className="border-red-500/20 bg-card/80 backdrop-blur-sm p-6">
                    <CardContent>
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-muted-foreground">
                            Chưa có thành viên nào rời CLB
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Danh sách thành viên đã rời sẽ hiển thị ở đây
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {!leftMembersLoading &&
                !leftMembersError &&
                filteredLeftMembers.map((member) => (
                  <Card
                    key={`${member.userId}-${member.studentCode}`}
                    className="border-red-500/20 hover:border-red-500/40 transition-all hover:shadow-glow hover:scale-[1.01] group bg-card/80 backdrop-blur-sm overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <CardContent className="relative z-10">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Member Info */}
                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 blur-md opacity-20 rounded-full"></div>
                            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-red-500/30 relative">
                              <AvatarImage
                                src={member.avatarUrl}
                                alt={member.fullName}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                                {member.fullName.split(" ").pop()?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold">
                                {member.fullName}
                              </h3>
                              <span className="text-sm text-muted-foreground">
                                {member.studentCode}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                                Đã rời CLB
                              </Badge>
                              {member.endDate && (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground"
                                >
                                  Rời ngày:{" "}
                                  {new Date(member.endDate).toLocaleDateString(
                                    "vi-VN"
                                  )}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{member.email}</span>
                              </div>
                              {member.phoneNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{member.phoneNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 sm:gap-6 flex-wrap lg:flex-nowrap">
                          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 min-w-[70px]">
                            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                              {member.totalTerms}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              kỳ tham gia
                            </div>
                          </div>
                          <div className="hidden sm:block text-center p-3 rounded-xl bg-secondary/50 border border-border min-w-[90px]">
                            <div className="text-sm font-medium flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(member.joinDate).toLocaleDateString(
                                "vi-VN"
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tham gia
                            </div>
                          </div>

                          {isOfficer && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500/30 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm hover:shadow-glow transition-all"
                                onClick={() => setSelectedMember(member)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">
                                  Xem chi tiết
                                </span>
                                <span className="sm:hidden">Chi tiết</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Left Members Pagination Summary + Controls */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Trang{" "}
                  <span className="font-semibold text-red-500">
                    {leftMembersPageNum + 1}
                  </span>{" "}
                  /{" "}
                  <span className="font-medium">
                    {leftMembersPage?.totalPages ?? 1}
                  </span>
                </div>
                <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-red-500/10 text-red-600 font-semibold text-sm">
                  {leftMembersPage?.totalElements ?? 0} thành viên đã rời
                </div>
              </div>
              <div />
            </div>

            {leftMembersPage && leftMembersPage.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        size="default"
                        onClick={() =>
                          setLeftMembersPageNum((prev) => Math.max(0, prev - 1))
                        }
                        className={
                          leftMembersPageNum === 0
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from(
                      { length: leftMembersPage.totalPages },
                      (_, i) => i
                    ).map((pageNum) => {
                      if (
                        pageNum === 0 ||
                        pageNum === leftMembersPage.totalPages - 1 ||
                        (pageNum >= leftMembersPageNum - 1 &&
                          pageNum <= leftMembersPageNum + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              size="default"
                              onClick={() => setLeftMembersPageNum(pageNum)}
                              isActive={leftMembersPageNum === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum + 1}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (
                        pageNum === leftMembersPageNum - 2 ||
                        pageNum === leftMembersPageNum + 2
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext
                        size="default"
                        onClick={() =>
                          setLeftMembersPageNum((prev) =>
                            Math.min(leftMembersPage.totalPages - 1, prev + 1)
                          )
                        }
                        className={
                          leftMembersPageNum >= leftMembersPage.totalPages - 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Role Dialog */}
        <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Chỉnh sửa vai trò
              </DialogTitle>
              <DialogDescription>
                Cập nhật vai trò cho {selectedMember?.fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role">Chọn vai trò mới</Label>
                <Select
                  value={selectedMemberRole}
                  onValueChange={setSelectedMemberRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.roleName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedMemberRole && (
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-sm text-muted-foreground">
                    {
                      clubRoles.find(
                        (r) => r.id.toString() === selectedMemberRole
                      )?.description
                    }
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditRoleOpen(false)}
              >
                Hủy
              </Button>
              <Button onClick={handleSaveRole}>Lưu thay đổi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Status Dialog */}
        <Dialog open={isChangeStatusOpen} onOpenChange={setIsChangeStatusOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedMember?.currentTerm?.isActive ? (
                  <UserX className="h-5 w-5 text-yellow-600" />
                ) : (
                  <UserCheck className="h-5 w-5 text-green-600" />
                )}
                {selectedMember?.currentTerm?.isActive
                  ? "Tạm ngưng thành viên"
                  : "Kích hoạt thành viên"}
              </DialogTitle>
              <DialogDescription>
                {selectedMember?.currentTerm?.isActive
                  ? `Tạm ngưng hoạt động của ${selectedMember?.fullName}? Bạn có thể kích hoạt lại sau.`
                  : `Kích hoạt lại ${selectedMember?.fullName} để thành viên có thể tham gia hoạt động.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsChangeStatusOpen(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleChangeStatus}
                className={
                  selectedMember?.currentTerm?.isActive
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-green-600 hover:bg-green-700"
                }
              >
                {selectedMember?.currentTerm?.isActive
                  ? "Tạm ngưng"
                  : "Kích hoạt"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove from Club Dialog */}
        <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <UserX className="h-5 w-5" />
                Đá khỏi CLB
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn đá {selectedMember?.fullName} khỏi CLB?
                Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Lưu ý: Thành viên sẽ bị gỡ tất cả quyền và không thể tham
                  gia hoạt động CLB nữa.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRemoveOpen(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleRemoveMember}>
                Xác nhận đá khỏi CLB
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Team Dialog */}
        <Dialog open={isAssignTeamOpen} onOpenChange={setIsAssignTeamOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                Phân ban
              </DialogTitle>
              <DialogDescription>
                Phân {selectedMember?.fullName} vào ban chuyên môn
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="team">Chọn ban</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ban" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.teamName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-600">
                  💡 Mỗi thành viên chỉ thuộc 1 ban chính. Nếu thành viên tham
                  gia nhiều ban, hãy chọn ban có trách nhiệm chính.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAssignTeamOpen(false)}
              >
                Hủy
              </Button>
              <Button onClick={handleAssignTeam}>Lưu thay đổi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Excel Dialog */}
        <Dialog open={isImportExcelOpen} onOpenChange={setIsImportExcelOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Import thành viên từ Excel
              </DialogTitle>
              <DialogDescription>
                Thêm hàng loạt thành viên vào CLB từ file Excel
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Instructions */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-blue-700 dark:text-blue-400">
                      Hướng dẫn sử dụng:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-300">
                      <li>Tải file Excel mẫu bằng nút bên dưới</li>
                      <li>
                        Điền thông tin thành viên vào file theo định dạng mẫu
                      </li>
                      <li>Lưu file và tải lên hệ thống</li>
                      <li>Hệ thống sẽ tự động kiểm tra và thêm thành viên</li>
                    </ol>
                  </div>
                </div>

                {/* Template Download */}
                <div className="p-4 rounded-lg border border-muted bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">File Excel mẫu</p>
                        <p className="text-xs text-muted-foreground">
                          Template_ThanhVien_CLB.xlsx
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        // Dynamically import xlsx library
                        const XLSX = await import("xlsx");

                        // Create workbook and worksheet
                        const wb = XLSX.utils.book_new();

                        // Create data array with headers and example row
                        const data = [
                          [
                            "student_code",
                            "full_name",
                            "email",
                            "phone",
                            "semester_code",
                            "role_code",
                            "team_name",
                            "is_active",
                            "join_date",
                          ],
                          [
                            "SE123456",
                            "Nguyễn Văn A",
                            "anvse123456@fpt.edu.vn",
                            "0912345678",
                            "SP25",
                            "MEMBER",
                            "Truyền thông",
                            "true",
                            "2025-01-15",
                          ],
                        ];

                        // Convert to worksheet
                        const ws = XLSX.utils.aoa_to_sheet(data);

                        // Set column widths
                        ws["!cols"] = [
                          { wch: 15 }, // student_code
                          { wch: 20 }, // full_name
                          { wch: 30 }, // email
                          { wch: 15 }, // phone
                          { wch: 15 }, // semester_code
                          { wch: 12 }, // role_code
                          { wch: 20 }, // team_name
                          { wch: 10 }, // is_active
                          { wch: 12 }, // join_date
                        ];

                        // Add worksheet to workbook
                        XLSX.utils.book_append_sheet(wb, ws, "Members");

                        // Generate Excel file and download
                        XLSX.writeFile(wb, "Template_ThanhVien_CLB.xlsx");
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Tải xuống mẫu
                    </Button>
                  </div>
                </div>

                {/* Format Guide */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Định dạng file Excel:</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">
                            Tên cột
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Mô tả
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Bắt buộc
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Ví dụ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">
                            student_code
                          </td>
                          <td className="px-3 py-2">Mã sinh viên</td>
                          <td className="px-3 py-2">
                            <Badge variant="destructive" className="text-xs">
                              Có
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            SE123456
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">
                            full_name
                          </td>
                          <td className="px-3 py-2">Họ và tên</td>
                          <td className="px-3 py-2">
                            <Badge variant="destructive" className="text-xs">
                              Có
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            Nguyễn Văn A
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">
                            semester_code
                          </td>
                          <td className="px-3 py-2">Mã học kỳ</td>
                          <td className="px-3 py-2">
                            <Badge variant="destructive" className="text-xs">
                              Có
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            SP25
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">email</td>
                          <td className="px-3 py-2">Email sinh viên</td>
                          <td className="px-3 py-2">
                            <Badge variant="destructive" className="text-xs">
                              Có
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            anvse@fpt.edu.vn
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">phone</td>
                          <td className="px-3 py-2">Số điện thoại</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              Không
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            0912345678
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">
                            role_code
                          </td>
                          <td className="px-3 py-2">Mã vai trò</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              Không
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            MEMBER, LEADER
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">
                            team_name
                          </td>
                          <td className="px-3 py-2">Tên ban</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              Không
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            Truyền thông
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">
                            is_active
                          </td>
                          <td className="px-3 py-2">Trạng thái</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              Không
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            true/false
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">
                            join_date
                          </td>
                          <td className="px-3 py-2">Ngày tham gia</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              Không
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            2025-01-15
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="space-y-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        Lưu ý quan trọng:
                      </p>
                      <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-1 list-disc list-inside">
                        <li>
                          <strong>student_code</strong> và{" "}
                          <strong>semester_code</strong> là bắt buộc
                        </li>
                        <li>
                          Nếu mã sinh viên đã tồn tại, hệ thống sẽ cập nhật
                          thông tin
                        </li>
                        <li>
                          Một sinh viên có thể có nhiều dòng với các
                          semester_code khác nhau
                        </li>
                        <li>
                          semester_code phải tồn tại trong hệ thống (VD: SP25,
                          SU25, FA25)
                        </li>
                        <li>
                          role_code phải khớp với mã vai trò trong CLB (VD:
                          MEMBER, LEADER)
                        </li>
                        <li>
                          team_name phải khớp chính xác với tên ban đã tạo
                        </li>
                        <li>is_active mặc định là true nếu không chỉ định</li>
                        <li>
                          join_date mặc định là ngày hiện tại nếu không chỉ định
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <Label htmlFor="excel-file" className="text-base font-semibold">
                  Chọn file Excel
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("File không được vượt quá 5MB");
                          e.target.value = "";
                          return;
                        }
                        setExcelFile(file);
                      }
                    }}
                    className="flex-1"
                  />
                  {excelFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExcelFile(null);
                        const input = document.getElementById(
                          "excel-file"
                        ) as HTMLInputElement;
                        if (input) input.value = "";
                      }}
                    >
                      Xóa
                    </Button>
                  )}
                </div>
                {excelFile && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-600">
                      Đã chọn:{" "}
                      <span className="font-medium">{excelFile.name}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsImportExcelOpen(false);
                  setExcelFile(null);
                }}
                disabled={importing}
              >
                Hủy
              </Button>
              <Button
                onClick={async () => {
                  if (!excelFile) {
                    toast.error("Vui lòng chọn file Excel");
                    return;
                  }

                  const currentUser = authService.getCurrentUser();
                  if (!currentUser?.id) {
                    toast.error("Không thể xác định người dùng hiện tại");
                    return;
                  }

                  setImporting(true);
                  try {
                    const response = await memberService.importMembersFromExcel(
                      Number(clubId),
                      excelFile,
                      currentUser.id
                    );

                    if (response.code !== 200 || !response.data) {
                      throw new Error(response.message || "Import failed");
                    }

                    const result = response.data;

                    // Format Vietnamese message
                    const formatSummary = () => {
                      const parts: string[] = [];

                      if (result.createdUsers > 0) {
                        parts.push(`${result.createdUsers} người dùng mới`);
                      }
                      if (result.updatedUsers > 0) {
                        parts.push(
                          `${result.updatedUsers} người dùng được cập nhật`
                        );
                      }
                      if (result.createdMemberships > 0) {
                        parts.push(
                          `${result.createdMemberships} thành viên mới`
                        );
                      }
                      if (result.updatedMemberships > 0) {
                        parts.push(
                          `${result.updatedMemberships} thành viên cập nhật`
                        );
                      }
                      if (result.createdRoleMemberships > 0) {
                        parts.push(
                          `${result.createdRoleMemberships} lịch sử vai trò mới`
                        );
                      }
                      if (result.updatedRoleMemberships > 0) {
                        parts.push(
                          `${result.updatedRoleMemberships} lịch sử vai trò cập nhật`
                        );
                      }

                      return parts.length > 0
                        ? parts.join(", ")
                        : `Đã xử lý ${result.processedUsers} người dùng`;
                    };

                    // Show detailed results
                    if (result.errors && result.errors.length > 0) {
                      toast.warning(
                        <div className="space-y-2">
                          <p className="font-semibold">
                            Import hoàn tất với một số lỗi
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            ✓ Thành công: {formatSummary()}
                          </p>
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            ⚠ Có {result.errors.length} lỗi:
                          </p>
                          <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                            {result.errors.slice(0, 5).map((err, idx) => (
                              <li key={idx}>
                                Dòng {err.row} ({err.studentCode} -{" "}
                                {err.semesterCode}): {err.message}
                              </li>
                            ))}
                            {result.errors.length > 5 && (
                              <li>...và {result.errors.length - 5} lỗi khác</li>
                            )}
                          </ul>
                        </div>,
                        { duration: 10000 }
                      );
                    } else {
                      toast.success(
                        <div className="space-y-2">
                          <p className="font-semibold">🎉 Import thành công!</p>
                          <div className="text-sm space-y-1">
                            <p>
                              📊 Tổng số dòng:{" "}
                              <strong>{result.totalRows}</strong>
                            </p>
                            <p>✓ {formatSummary()}</p>
                          </div>
                        </div>,
                        { duration: 6000 }
                      );
                    }

                    setIsImportExcelOpen(false);
                    setExcelFile(null);
                    loadMembers();
                  } catch (error: unknown) {
                    const errorMessage =
                      error instanceof Error
                        ? error.message
                        : "Vui lòng kiểm tra lại file";
                    toast.error(
                      <div className="space-y-1">
                        <p className="font-semibold">Import thất bại</p>
                        <p className="text-sm">{errorMessage}</p>
                      </div>
                    );
                  } finally {
                    setImporting(false);
                  }
                }}
                disabled={!excelFile || importing}
                className="gap-2"
              >
                {importing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import thành viên
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Member Detail Dialog - Outside container for full width */}
      <MemberDetailDialog
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => {
          setSelectedMember(null);
        }}
        clubId={clubId}
        roles={clubRoles}
        teams={teams}
        onUpdated={() => loadMembers()}
        isOfficer={isOfficer}
      />
    </div>
  );
};

export default Members;
