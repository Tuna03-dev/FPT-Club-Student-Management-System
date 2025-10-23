import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  Eye,
  Award,
  Calendar,
  Shield,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
// import { Skeleton } from "@/components/ui/skeleton";
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
import MemberDetailDialog from "@/components/features/member/MemberDetailDialog";
import {
  memberService,
  type MemberResponseDTO,
} from "@/services/memberService";
import { clubService, type SemesterDTO, type ClubRoleDTO } from "@/services/clubService";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState("Hoạt động");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedMember, setSelectedMember] =
    useState<MemberResponseDTO | null>(null);
  const [page, setPage] = useState(0); // 0-based
  const size = 10;
  const [loading, setLoading] = useState(false);
  const [membersPage, setMembersPage] = useState<MembersPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<SemesterDTO[]>([]);
  const [clubRoles, setClubRoles] = useState<ClubRoleDTO[]>([]);

  const clubId = 1; // TODO: replace with real club id from context/route
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [selectedMemberRole, setSelectedMemberRole] = useState<string>("");

  const fetchSemesters = async () => {
    try {
      const res = await clubService.getSemesters(clubId);
      if (res.code === 200 && res.data) {
        setSemesters(res.data);
        // Set current semester as default
        const currentSemester = res.data.find(semester => semester.isCurrent);
        if (currentSemester && !selectedTerm) {
          setSelectedTerm(currentSemester.id.toString());
        }
      }
    } catch (e: unknown) {
      console.error("Error fetching semesters:", e);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await clubService.getRoles(clubId);
      if (res.code === 200 && res.data) {
        setClubRoles(res.data);
      }
    } catch (e: unknown) {
      console.error("Error fetching roles:", e);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiStatus =
        selectedStatus === "Hoạt động"
          ? "ACTIVE"
          : selectedStatus === "Tạm nghỉ"
          ? "LEFT"
          : undefined;
      
      const res = await memberService.getMembers(clubId, {
        page,
        size,
        searchTerm: searchQuery || undefined,
        status: apiStatus,
        semesterId: selectedTerm ? parseInt(selectedTerm) : undefined,
        roleId: selectedRole !== "all" ? parseInt(selectedRole) : undefined,
      });
      
      if (res.code === 200 && res.data) {
        setMembersPage(res.data);
      } else {
        setError(res.message || "Không thể tải danh sách thành viên");
      }
    } catch (e: unknown) {
      // Log the error so the caught variable is used and developers can inspect it
      // while still showing a user-friendly message in the UI.
      // eslint-disable-next-line no-console
      console.error(e);
      setError("Có lỗi khi tải danh sách thành viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchSemesters();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  // Refetch when search or filter changes
  useEffect(() => {
    // Reset to first page when changing filters/search
    setPage(0);
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedStatus, selectedRole, selectedTerm]);

  const filteredMembers = useMemo(() => {
    // Server-side filtering is now handled by the API
    return membersPage?.content ?? [];
  }, [membersPage]);

  // Deprecated: replaced by getRoleColorByLevel

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      "Hoạt động": "bg-green-500/10 text-green-600 border-green-500/20",
      "Tạm nghỉ": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    };
    return (
      statusColors[status] || "bg-muted text-muted-foreground border-muted"
    );
  };

  const handleSaveRole = () => {
    if (!selectedMemberRole) {
      toast.error("Vui lòng chọn vai trò");
      return;
    }

    // TODO: Call API to update role; for now update local state view
    // if (selectedMember) {
    //   setSelectedMember({
    //     ...selectedMember,
    //     currentTerm: {
    //       ...selectedMember.currentTerm,
    //       role: selectedMemberRole,
    //     },
    //   });
    //   toast.success("Cập nhật vai trò thành công");
    //   setIsEditRoleOpen(false);
    // }
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
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                Quản lý thành viên
              </h1>
              <p className="text-muted-foreground mt-1">
                <span className="font-semibold text-primary">
                  {membersPage?.totalElements ?? 0}
                </span>{" "}
                thành viên
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20">
            <Award className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">CLB FPT</span>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-primary/20 shadow-medium bg-card/80 backdrop-blur-sm">
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-primary/20 focus:border-primary"
                />
              </div>

              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="border-primary/20">
                  <SelectValue placeholder="Chọn kỳ học" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id.toString()}>
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

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="border-primary/20">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hoạt động">Hoạt động</SelectItem>
                  <SelectItem value="Tạm nghỉ">Tạm nghỉ</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="border-primary/20">
                  <SelectValue placeholder="Tất cả vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  {clubRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{role.roleName}</span>
                        <Badge variant="outline" className="text-xs">
                          Level {role.roleLevel}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          {error && (
            <div className="text-center text-destructive py-6">{error}</div>
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
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{member.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{member.phoneNumber}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap lg:flex-nowrap">
                      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20 min-w-[70px]">
                        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                          {member.totalAttendanceRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          điểm danh
                        </div>
                      </div>
                      <div className="hidden sm:block text-center p-3 rounded-xl bg-secondary/50 border border-border min-w-[90px]">
                        <div className="text-sm font-medium flex items-center justify-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {member.joinDate}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tham gia
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-glow transition-all"
                        onClick={() => setSelectedMember(member)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Xem chi tiết</span>
                        <span className="sm:hidden">Chi tiết</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Trang {page + 1} / {membersPage?.totalPages ?? 1} — Tổng{" "}
            {membersPage?.totalElements ?? 0}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!membersPage && page >= membersPage.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>

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
                      <SelectItem key={role.id} value={role.roleName}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.roleName}</span>
                          <Badge variant="outline" className="text-xs">
                            Level {role.roleLevel}
                          </Badge>
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
                        (r) => r.roleName === selectedMemberRole
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
      </div>

      {/* Member Detail Dialog - Outside container for full width */}
      <MemberDetailDialog
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
};

export default Members;
