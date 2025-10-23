import {
  Mail,
  Award,
  TrendingUp,
  Clock,
  Edit2,
  UserX,
  UserCog,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type MemberResponseDTO } from "@/services/memberService";

interface MemberDetailDialogProps {
  member: MemberResponseDTO | null;
  isOpen: boolean;
  onClose: () => void;
  clubId?: number;
}

const MemberDetailDialog = ({
  member,
  isOpen,
  onClose,
  clubId = 1,
}: MemberDetailDialogProps) => {
  // action handlers
  const handleChangeRole = async () => {
    if (!member) return;
    const input = window.prompt("Nhập roleId mới (số):");
    if (!input) return;
    const roleId = Number(input);
    if (Number.isNaN(roleId)) {
      toast.error("RoleId không hợp lệ");
      return;
    }
    try {
      await (
        await import("@/services/memberService")
      ).memberService.changeRole(clubId, member.userId, roleId);
      toast.success("Cập nhật vai trò thành công");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật vai trò thất bại");
    }
  };

  const handleAssignTeam = async () => {
    if (!member) return;
    const input = window.prompt("Nhập teamId để phân ban (số):");
    if (!input) return;
    const teamId = Number(input);
    if (Number.isNaN(teamId)) {
      toast.error("TeamId không hợp lệ");
      return;
    }
    try {
      await (
        await import("@/services/memberService")
      ).memberService.assignTeam(clubId, member.userId, teamId);
      toast.success("Phân ban thành công");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Phân ban thất bại");
    }
  };

  const handleToggleActive = async () => {
    if (!member) return;
    // do not allow toggling if member has left
    const membershipStatus = (
      member as unknown as { membershipStatus?: string }
    ).membershipStatus;
    if (membershipStatus === "LEFT") {
      toast.error("Thành viên đã rời, không thể thay đổi trạng thái");
      return;
    }
    const currentlyActive = member.currentTerm?.isActive === true;
    const newStatus = currentlyActive ? "INACTIVE" : "ACTIVE";
    const confirm = window.confirm(
      `Bạn có chắc muốn chuyển trạng thái sang ${newStatus}?`
    );
    if (!confirm) return;
    try {
      await (
        await import("@/services/memberService")
      ).memberService.changeStatus(clubId, member.userId, newStatus);
      toast.success("Cập nhật trạng thái thành công");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật trạng thái thất bại");
    }
  };

  const handleRemove = async () => {
    if (!member) return;
    const confirm = window.confirm(
      "Bạn có chắc muốn đá thành viên này khỏi CLB? Hành động không thể hoàn tác."
    );
    if (!confirm) return;
    try {
      await (
        await import("@/services/memberService")
      ).memberService.removeMember(clubId, member.userId);
      toast.success("Đã đá thành viên khỏi CLB");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Xóa thành viên thất bại");
    }
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

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      "Hoạt động": "bg-green-500/10 text-green-600 border-green-500/20",
      "Tạm nghỉ": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      "Đã nghỉ": "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return (
      statusColors[status] || "bg-muted text-muted-foreground border-muted"
    );
  };

  const statusToLabel = (status?: boolean) => {
    switch (status) {
      case true:
        return "Hoạt động";
      case false:
        return "Tạm nghỉ";
      default:
        return "";
    }
  };

  // New helper to derive the display label for a member, considering membershipStatus
  const getMemberStatusLabel = (member: MemberResponseDTO | null): string => {
    if (!member) return "";
    // If membership status explicitly indicates left, show 'Đã rời'
    const membershipStatus = (
      member as unknown as { membershipStatus?: string }
    ).membershipStatus;
    if (membershipStatus === "LEFT") return "Đã rời";
    return statusToLabel(member.currentTerm?.isActive);
  };

  const getMemberStatusColor = (member: MemberResponseDTO | null) => {
    const label = getMemberStatusLabel(member);
    // Map 'Đã rời' to the same color as "Đã nghỉ" (left -> red)
    if (label === "Đã rời") return getStatusColor("Đã nghỉ");
    return getStatusColor(label);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] md:min-w-2xl min-w-[320px] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30">
              <AvatarImage src={member?.avatarUrl} alt={member?.fullName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                {member?.fullName.split(" ").pop()?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {member?.fullName}
              </div>
              <div className="text-sm text-muted-foreground font-normal">
                {member?.studentCode}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {member && (
          <div className="space-y-6 mt-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                      <Mail className="h-4 w-4 text-primary-foreground" />
                    </div>
                    Thông tin cơ bản
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">MSSV:</span>
                    <span className="font-semibold">{member.studentCode}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-semibold text-right">
                      {member.email}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">SĐT:</span>
                    <span className="font-semibold">{member.phoneNumber}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Tham gia từ:</span>
                    <span className="font-semibold">{member.joinDate}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">
                      Hoạt động cuối:
                    </span>
                    <span className="font-semibold">{member.lastActive}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary-glow/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                      <Award className="h-4 w-4 text-primary-foreground" />
                    </div>
                    Thống kê tổng quan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Điểm danh TB:</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      {member.totalAttendanceRate}%
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">
                      Số kỳ tham gia:
                    </span>
                    <span className="font-semibold">
                      {member.totalTerms} kỳ
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">
                      Vai trò hiện tại:
                    </span>
                    {getDisplayRoleInfo(member) && (
                      <Badge
                        className={getRoleColorByLevel(
                          getDisplayRoleInfo(member)?.roleLevel
                        )}
                      >
                        {getDisplayRoleInfo(member)?.roleName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <Badge className={getMemberStatusColor(member)}>
                      {getMemberStatusLabel(member)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons - Only for current members (not LEFT) */}
            {(member as unknown as { membershipStatus?: string })
              .membershipStatus !== "LEFT" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="w-full border-primary/30 hover:bg-primary/10"
                  onClick={handleChangeRole}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Thay đổi vai trò
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-blue-500/30 hover:bg-blue-500/10 text-blue-600"
                  onClick={handleAssignTeam}
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Phân ban
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-600"
                  onClick={handleToggleActive}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Tạm ngưng / Kích hoạt
                </Button>
              </div>
            )}

            {/* Remove Button - Only for active/deactive members */}
            {(member as unknown as { membershipStatus?: string })
              .membershipStatus !== "LEFT" && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleRemove}
              >
                <UserX className="h-4 w-4 mr-2" />
                Đá khỏi CLB
              </Button>
            )}

            {/* Current Term */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary-glow/5 to-primary/5 shadow-glow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                    <TrendingUp className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    Kỳ hiện tại: {member.currentTerm?.semesterName || "N/A"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-2">
                    Điểm đóng góp
                  </div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex items-center justify-center gap-1">
                    {member.currentTerm?.attendanceRate || 0}
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-2">
                    Điểm danh
                  </div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex items-center justify-center gap-1">
                    {member.currentTerm?.attendanceRate || 0}%
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-2">
                    Vai trò
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-sm font-medium">
                      {getDisplayRoleInfo(member)?.roleName || "N/A"}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        // Handle edit role - this would be passed as a prop or handled by parent
                        toast.info("Chức năng chỉnh sửa vai trò");
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20 flex flex-col items-center justify-center">
                  <div className="text-xs text-muted-foreground mb-2">
                    Trạng thái
                  </div>
                  <Badge className={getMemberStatusColor(member)}>
                    {getMemberStatusLabel(member)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Activity History */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Lịch sử hoạt động theo kỳ
              </h3>
              <div className="space-y-3">
                {member.history.map((term, index) => (
                  <Card
                    key={index}
                    className="border-primary/20 hover:border-primary/30 transition-all hover:shadow-medium bg-gradient-to-r from-card to-secondary/20"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-lg">
                              {term.semesterName}
                            </span>
                            <Badge
                              className={getRoleColorByLevel(term.roleLevel)}
                            >
                              {term.roleName}
                            </Badge>
                            <Badge
                              className={getStatusColor(
                                statusToLabel(term.isActive)
                              )}
                            >
                              {statusToLabel(term.isActive)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="font-medium">
                              Ban: {term.teamName || "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {term.startDate}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20 min-w-[70px]">
                            <div className="text-lg font-bold text-primary">
                              {term.attendanceRate || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ĐD
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailDialog;
