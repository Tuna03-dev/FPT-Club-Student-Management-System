import {
  Mail,
  Award,
  TrendingUp,
  Clock,
  UserX,
  UserCog,
  Shield,
  UserCheck,
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { type MemberResponseDTO } from "@/services/memberService";
import { type ClubRoleDTO, type TeamDTO } from "@/services/clubService";
import { memberService } from "@/services/memberService";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/utils";

interface MemberDetailDialogProps {
  member: MemberResponseDTO | null;
  isOpen: boolean;
  onClose: () => void;
  clubId?: number;
  roles: ClubRoleDTO[];
  teams: TeamDTO[];
  onUpdated?: () => void;
  isOfficer?: boolean;
}

const MemberDetailDialog = ({
  member,
  isOpen,
  onClose,
  clubId,
  roles,
  teams,
  onUpdated,
  isOfficer = true, // Default to true for backward compatibility
}: MemberDetailDialogProps) => {
  // Dialog states
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  // action handlers - Combined update for role and team
  const handleUpdateMember = async () => {
    if (!member || !clubId) {
      toast.error("Thiếu thông tin thành viên");
      return;
    }

    // Validation
    if (!selectedRole) {
      toast.error("Vui lòng chọn vai trò");
      return;
    }

    if (!selectedTeam) {
      toast.error("Vui lòng chọn ban");
      return;
    }

    setIsActionLoading(true);
    try {
      const roleId = parseInt(selectedRole);
      const teamId = parseInt(selectedTeam);
      const currentUser = authService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        toast.error("Không xác định người dùng hiện tại");
        return;
      }

      // Update role first
      await memberService.changeRole(
        clubId,
        member.userId,
        roleId,
        currentUser.id
      );

      // Then assign team
      await memberService.assignTeam(clubId, member.userId, teamId);

      toast.success("Cập nhật thông tin thành viên thành công");
      setIsEditMemberOpen(false);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMessage = getErrorMessage(err, "Cập nhật thông tin thất bại");
      toast.error(errorMessage);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!member || !clubId) return;
    // do not allow toggling if member has left
    const membershipStatus = (
      member as unknown as { membershipStatus?: string }
    ).membershipStatus;
    if (membershipStatus === "LEFT") {
      toast.error("Thành viên đã rời, không thể thay đổi trạng thái");
      return;
    }
    setIsActionLoading(true);
    try {
      const currentlyActive = member.currentTerm?.isActive === true;
      await memberService.changeStatus(
        clubId,
        member.userId,
        !currentlyActive,
        { semesterId: undefined }
      );
      toast.success("Cập nhật trạng thái thành công");
      setIsChangeStatusOpen(false);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMessage = getErrorMessage(err, "Cập nhật trạng thái thất bại");
      toast.error(errorMessage);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!member || !clubId) return;
    setIsActionLoading(true);
    try {
      await memberService.removeMember(clubId, member.userId);
      toast.success("Đã đá thành viên khỏi CLB");
      setIsRemoveOpen(false);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMessage = getErrorMessage(err, "Xóa thành viên thất bại");
      toast.error(errorMessage);
    } finally {
      setIsActionLoading(false);
    }
  };

  const openEditMemberDialog = () => {
    if (member) {
      // Set current role
      const currentRole = getDisplayRoleInfo(member)?.roleName || "";
      const currentRoleObj = roles.find(
        (role) => role.roleName === currentRole
      );
      setSelectedRole(currentRoleObj ? currentRoleObj.id.toString() : "");

      // Set current team
      const currentTeamName = member.currentTerm?.teamName || "";
      const currentTeamObj = teams.find(
        (team) => team.teamName === currentTeamName
      );
      setSelectedTeam(currentTeamObj ? currentTeamObj.id.toString() : "");

      setIsEditMemberOpen(true);
    }
  };

  const openChangeStatusDialog = () => {
    setIsChangeStatusOpen(true);
  };

  const openRemoveDialog = () => {
    setIsRemoveOpen(true);
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
    member: MemberResponseDTO | null
  ): { roleName: string; roleLevel: number } | null => {
    if (!member) return null;

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
    <>
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
                <div className="bg-primary bg-clip-text text-transparent">
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
                      <span className="font-semibold">
                        {member.studentCode}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-semibold text-right">
                        {member.email}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">SĐT:</span>
                      <span className="font-semibold">
                        {member.phoneNumber}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">
                        Tham gia từ:
                      </span>
                      <span className="font-semibold">{member.joinDate}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">
                        Hoạt động cuối:
                      </span>
                      <span className="font-semibold">
                        {member.lastActive || "Chưa có hoạt động"}
                      </span>
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
                    {/* Ẩn điểm danh TB */}
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

              {/* Action Buttons - Only for officers and current members (not LEFT) */}
              {isOfficer &&
                (member as unknown as { membershipStatus?: string })
                  .membershipStatus !== "LEFT" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full border-primary/30 hover:bg-primary/10"
                        onClick={openEditMemberDialog}
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Chỉnh sửa vai trò & phân ban
                      </Button>
                      {member.currentTerm?.isActive ? (
                        <Button
                          variant="outline"
                          className="w-full border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-600"
                          onClick={openChangeStatusDialog}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Tạm ngưng
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full border-green-500/30 hover:bg-green-500/10 text-green-600"
                          onClick={openChangeStatusDialog}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Kích hoạt
                        </Button>
                      )}
                    </div>

                    {/* Remove Button - Only for active/deactive members */}
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={openRemoveDialog}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Đá khỏi CLB
                    </Button>
                  </>
                )}

              {/* Read-only notice for regular members */}
              {!isOfficer && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          Bạn đang xem thông tin thành viên. Chỉ Chủ nhiệm và
                          Phó Chủ nhiệm mới có quyền chỉnh sửa.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Term */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary-glow/5 to-primary/5 shadow-glow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                      <TrendingUp className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="bg-primary bg-clip-text text-transparent">
                      Kỳ hiện tại: {member.currentTerm?.semesterName || "N/A"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-2">
                      Vai trò
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {getDisplayRoleInfo(member)?.roleName ? (
                        <Badge
                          className={getRoleColorByLevel(
                            getDisplayRoleInfo(member)?.roleLevel
                          )}
                        >
                          {getDisplayRoleInfo(member)?.roleName}
                        </Badge>
                      ) : (
                        <div className="text-sm font-medium">N/A</div>
                      )}
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-2">
                      Phòng Ban
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {member.currentTerm?.teamName ? (
                        <Badge
                          variant="outline"
                          className="border-orange-500/30 text-orange-600"
                        >
                          {member.currentTerm.teamName}
                        </Badge>
                      ) : (
                        <div className="text-sm font-medium">N/A</div>
                      )}
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
                          {/* Ẩn điểm danh lịch sử */}
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

      {/* Edit Member Dialog - Combined Role & Team */}
      <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Chỉnh sửa thông tin thành viên
            </DialogTitle>
            <DialogDescription>
              Cập nhật vai trò và phân ban cho {member?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Current Information */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Thông tin hiện tại:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={getRoleColorByLevel(
                    getDisplayRoleInfo(member)?.roleLevel
                  )}
                >
                  {getDisplayRoleInfo(member)?.roleName || "N/A"}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <Badge
                  variant="outline"
                  className="border-orange-500/30 text-orange-600"
                >
                  {member?.currentTerm?.teamName || "Chưa có ban"}
                </Badge>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Vai trò <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger
                  className={!selectedRole ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.roleName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole && (
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-sm text-muted-foreground">
                    {roles.find((role) => role.id.toString() === selectedRole)
                      ?.description ||
                      `Vai trò ${
                        roles.find(
                          (role) => role.id.toString() === selectedRole
                        )?.roleName
                      } có quyền hạn và trách nhiệm tương ứng trong CLB.`}
                  </p>
                </div>
              )}
            </div>

            {/* Team Selection */}
            <div className="space-y-2">
              <Label htmlFor="team" className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-primary" />
                Phòng ban <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger
                  className={!selectedTeam ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Chọn ban" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{team.teamName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Note */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-600">
                💡 <strong>Lưu ý:</strong> Vai trò và ban sẽ được cập nhật đồng
                thời. Đảm bảo vai trò phù hợp với vị trí trong ban đã chọn.
              </p>
            </div>

            {/* Validation Warning */}
            {(!selectedRole || !selectedTeam) && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">
                  ⚠️ Vui lòng chọn đầy đủ vai trò và phòng ban
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditMemberOpen(false)}
              disabled={isActionLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleUpdateMember}
              disabled={isActionLoading || !selectedRole || !selectedTeam}
            >
              {isActionLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={isChangeStatusOpen} onOpenChange={setIsChangeStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {member?.currentTerm?.isActive ? (
                <UserX className="h-5 w-5 text-yellow-600" />
              ) : (
                <UserCheck className="h-5 w-5 text-green-600" />
              )}
              {member?.currentTerm?.isActive
                ? "Tạm ngưng thành viên"
                : "Kích hoạt thành viên"}
            </DialogTitle>
            <DialogDescription>
              {member?.currentTerm?.isActive
                ? `Tạm ngưng hoạt động của ${member?.fullName}? Bạn có thể kích hoạt lại sau.`
                : `Kích hoạt lại ${member?.fullName} để thành viên có thể tham gia hoạt động.`}
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
              onClick={handleToggleActive}
              className={
                member?.currentTerm?.isActive
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-green-600 hover:bg-green-700"
              }
              disabled={isActionLoading}
            >
              {member?.currentTerm?.isActive ? "Tạm ngưng" : "Kích hoạt"}
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
              Bạn có chắc chắn muốn đá {member?.fullName} khỏi CLB? Hành động
              này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Lưu ý: Thành viên sẽ bị gỡ tất cả quyền và không thể tham gia
                hoạt động CLB nữa.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isActionLoading}
            >
              Xác nhận đá khỏi CLB
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MemberDetailDialog;
