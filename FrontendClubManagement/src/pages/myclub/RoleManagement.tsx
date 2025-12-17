import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { clubService, type ClubRoleDTO } from "@/services/clubService";
import { mockSystemRoles } from "@/data/mockRoles";
import { Skeleton } from "@/components/ui/skeleton";

// Validation rules for system role and level matching
const ROLE_LEVEL_RULES = {
  CLUB_OFFICER: {
    min: 1,
    max: 2,
    description: "Level 1-2 (Chủ tịch, Phó chủ tịch)",
  },
  TEAM_OFFICER: {
    min: 3,
    max: 4,
    description: "Level 3-4 (Trưởng ban, Phó ban)",
  },
  CLUB_TREASURE: { min: 3, max: 3, description: "Level 3 (Thủ quỹ)" },
  MEMBER: { min: 4, max: 6, description: "Level 4+ (Thành viên)" },
};

export default function RoleManagement() {
  const { clubId } = useParams<{ clubId: string }>();
  const [clubRoles, setClubRoles] = useState<ClubRoleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<ClubRoleDTO | null>(null);
  const [editingRole, setEditingRole] = useState<ClubRoleDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    roleName: "",
    description: "",
    roleLevel: 1,
    systemRoleId: 0,
  });
  const [validationErrors, setValidationErrors] = useState<{
    roleName?: string;
    roleLevel?: string;
  }>({});

  // Load club roles from API
  useEffect(() => {
    const loadRoles = async () => {
      if (!clubId) return;

      setLoading(true);
      try {
        const response = await clubService.getRoles(Number(clubId));
        if (response.code === 200 && response.data) {
          // Sort by roleLevel ascending (1, 2, 3...)
          const sortedRoles = [...response.data].sort(
            (a, b) => a.roleLevel - b.roleLevel
          );
          setClubRoles(sortedRoles);
        } else {
          toast.error("Không thể tải danh sách role");
        }
      } catch (error) {
        console.error("Failed to load roles:", error);
        toast.error("Không thể tải danh sách role");
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [clubId]);

  const handleOpenDialog = (role?: ClubRoleDTO) => {
    setValidationErrors({}); // Clear previous errors

    if (role) {
      setEditingRole(role);
      setFormData({
        roleName: role.roleName,
        description: role.description || "",
        roleLevel: role.roleLevel,
        systemRoleId: role.systemRoleId,
      });
    } else {
      setEditingRole(null);
      setFormData({
        roleName: "",
        description: "",
        roleLevel: 3, // Default level 3 cho Trưởng ban
        systemRoleId: 4, // Default TEAM_OFFICER
      });
    }
    setIsDialogOpen(true);
  };

  // Validate individual fields
  const validateRoleName = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Tên role không được để trống";
    }
    if (value.length < 3) {
      return "Tên role phải có ít nhất 3 ký tự";
    }
    // Check duplicate role name (ignore current role if editing)
    const isDuplicate = clubRoles.some(
      (role) =>
        role.roleName.toLowerCase() === value.toLowerCase() &&
        (!editingRole || role.id !== editingRole.id)
    );
    if (isDuplicate) {
      return "Tên role đã tồn tại";
    }
    return undefined;
  };

  const validateRoleLevel = (
    level: number,
    systemRoleId: number
  ): string | undefined => {
    if (!systemRoleId) return undefined;

    const systemRole = mockSystemRoles.find((r) => r.id === systemRoleId);
    if (systemRole) {
      const rules =
        ROLE_LEVEL_RULES[systemRole.roleName as keyof typeof ROLE_LEVEL_RULES];
      if (rules) {
        if (level < rules.min || level > rules.max) {
          return `System Role "${systemRole.roleName}" chỉ phù hợp với ${rules.description}`;
        }
      }
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {
      roleName: validateRoleName(formData.roleName),
      roleLevel: validateRoleLevel(formData.roleLevel, formData.systemRoleId),
    };

    setValidationErrors(errors);
    return !errors.roleName && !errors.roleLevel;
  };

  const handleSaveRole = async () => {
    if (!clubId) {
      toast.error("Không tìm thấy Club ID");
      return;
    }

    if (!formData.systemRoleId) {
      toast.error("Vui lòng chọn System Role");
      return;
    }

    // Validate form
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    setSubmitting(true);
    try {
      // Auto-generate roleCode from roleName
      const roleCode = formData.roleName
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/Đ/g, "D")
        .replace(/đ/g, "d")
        .replace(/[^A-Z0-9]/g, "_") // Replace non-alphanumeric with underscore
        .replace(/_+/g, "_") // Replace multiple underscores with single
        .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

      const request = {
        roleName: formData.roleName,
        roleCode: roleCode,
        description: formData.description || undefined,
        roleLevel: formData.roleLevel,
        systemRoleId: formData.systemRoleId || null,
      };

      if (editingRole) {
        // Update existing role
        const response = await clubService.updateRole(
          Number(clubId),
          editingRole.id,
          request
        );

        if (response.code === 200 && response.data) {
          setClubRoles((prev) =>
            prev
              .map((role) =>
                role.id === editingRole.id ? response.data! : role
              )
              .sort((a, b) => a.roleLevel - b.roleLevel)
          );
          toast.success("Cập nhật role thành công");
          setIsDialogOpen(false);
        } else {
          toast.error("Không thể cập nhật role");
        }
      } else {
        // Create new role
        const response = await clubService.createRole(Number(clubId), request);

        if (response.code === 200 && response.data) {
          setClubRoles((prev) =>
            [...prev, response.data!].sort((a, b) => a.roleLevel - b.roleLevel)
          );
          toast.success("Tạo role mới thành công");
          setIsDialogOpen(false);
        } else {
          toast.error("Không thể tạo role");
        }
      }
    } catch (error) {
      console.error("Failed to save role:", error);
      toast.error(
        editingRole ? "Không thể cập nhật role" : "Không thể tạo role"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (role: ClubRoleDTO) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!clubId || !roleToDelete) return;

    setSubmitting(true);
    try {
      const response = await clubService.deleteRole(
        Number(clubId),
        roleToDelete.id
      );

      if (response.code === 200) {
        setClubRoles((prev) =>
          prev.filter((role) => role.id !== roleToDelete.id)
        );
        toast.success("Xóa role thành công");
        setDeleteDialogOpen(false);
        setRoleToDelete(null);
      } else {
        toast.error("Không thể xóa role");
      }
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error("Không thể xóa role");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-red-500"; // Chủ tịch - Đỏ (quyền cao nhất)
      case 2:
        return "bg-orange-500"; // Phó chủ tịch - Cam
      case 3:
        return "bg-yellow-500"; // Trưởng ban - Vàng
      case 4:
        return "bg-blue-500"; // Thành viên cốt cán - Xanh dương
      case 5:
        return "bg-green-500"; // Thành viên - Xanh lá
      case 6:
        return "bg-gray-500"; // Level 6 - Xám
      default:
        return "bg-purple-500"; // Level khác - Tím
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Quản lý phân quyền
          </h1>
          <p className="text-muted-foreground">
            Cấu hình và quản lý các vai trò trong câu lạc bộ
          </p>
        </div>

        {/* Hướng dẫn sử dụng */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">📋 Hướng dẫn phân quyền</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">
                🎯 Về System Roles:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>
                  • <strong>CLUB_OFFICER</strong>: Dành cho Chủ tịch, Phó chủ
                  tịch - quản lý toàn bộ CLB
                </li>
                <li>
                  • <strong>TEAM_OFFICER</strong>: Dành cho Trưởng ban các phòng
                  ban - quản lý sự kiện, hoạt động
                </li>
                <li>
                  • <strong>CLUB_TREASURE</strong>: Thủ quỹ CLB - được quyền như
                  Trưởng ban (mỗi người chỉ có 1 role)
                </li>
                <li>
                  • <strong>MEMBER</strong>: Thành viên thông thường của CLB
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">🔢 Về Role Level:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>
                  • <strong>Level càng thấp = Quyền càng cao</strong>
                </li>
                <li>• Level 1 (🔴): Chủ tịch - quyền cao nhất</li>
                <li>• Level 2 (🟠): Phó chủ tịch</li>
                <li>• Level 3 (🟡): Trưởng ban, Thủ quỹ</li>
                <li>• Level 4 (🔵): Thành viên cốt cán</li>
                <li>• Level 5+ (🟢): Thành viên thông thường</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">
                💡 Lưu ý quan trọng:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>
                  • Mỗi người chỉ có <strong>1 role duy nhất</strong>
                </li>
                <li>
                  • Thủ quỹ nên dùng System Role <strong>CLUB_TREASURE</strong>{" "}
                  (có quyền như Trưởng ban)
                </li>
                <li>
                  • Đặt tên role rõ ràng, VD: "Trưởng ban Nội dung (Thủ quỹ)"
                </li>
                <li>
                  • Không thể tạo role với System Role: ADMIN, STAFF, STUDENT
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Roles */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>System Roles</CardTitle>
              </div>
              <CardDescription>
                Các vai trò hệ thống cơ bản (không thể chỉnh sửa)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockSystemRoles.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {role.roleName}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        System
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Club Roles */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Club Roles</CardTitle>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => handleOpenDialog()}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRole ? "Chỉnh sửa role" : "Tạo role mới"}
                      </DialogTitle>
                      <DialogDescription>
                        Tùy chỉnh vai trò cho câu lạc bộ của bạn
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="roleName">Tên role *</Label>
                        <Input
                          id="roleName"
                          value={formData.roleName}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setFormData({
                              ...formData,
                              roleName: newValue,
                            });
                            // Validate on change
                            const error = validateRoleName(newValue);
                            setValidationErrors((prev) => ({
                              ...prev,
                              roleName: error,
                            }));
                          }}
                          placeholder="VD: Chủ tịch CLB"
                          className={
                            validationErrors.roleName ? "border-red-500" : ""
                          }
                        />
                        {validationErrors.roleName && (
                          <p className="text-sm text-red-500">
                            {validationErrors.roleName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="systemRole">System Role *</Label>
                        <Select
                          value={formData.systemRoleId.toString()}
                          onValueChange={(value) => {
                            const newSystemRoleId = parseInt(value);
                            setFormData({
                              ...formData,
                              systemRoleId: newSystemRoleId,
                            });
                            // Re-validate level when system role changes
                            const error = validateRoleLevel(
                              formData.roleLevel,
                              newSystemRoleId
                            );
                            setValidationErrors((prev) => ({
                              ...prev,
                              roleLevel: error,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn system role" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockSystemRoles
                              .filter(
                                (role) =>
                                  !["ADMIN", "STAFF", "STUDENT"].includes(
                                    role.roleName
                                  )
                              )
                              .map((role) => {
                                const rules =
                                  ROLE_LEVEL_RULES[
                                    role.roleName as keyof typeof ROLE_LEVEL_RULES
                                  ];
                                return (
                                  <SelectItem
                                    key={role.id}
                                    value={role.id.toString()}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {role.roleName}
                                      </span>
                                      {rules && (
                                        <span className="text-xs text-muted-foreground">
                                          {rules.description}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roleLevel">Cấp độ *</Label>
                        <Input
                          id="roleLevel"
                          type="number"
                          min="1"
                          max="6"
                          value={formData.roleLevel}
                          onChange={(e) => {
                            const newLevel = parseInt(e.target.value) || 1;
                            setFormData({
                              ...formData,
                              roleLevel: newLevel,
                            });
                            // Validate on change
                            const error = validateRoleLevel(
                              newLevel,
                              formData.systemRoleId
                            );
                            setValidationErrors((prev) => ({
                              ...prev,
                              roleLevel: error,
                            }));
                          }}
                          className={
                            validationErrors.roleLevel ? "border-red-500" : ""
                          }
                        />
                        {validationErrors.roleLevel && (
                          <p className="text-sm text-red-500 flex items-start gap-1">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{validationErrors.roleLevel}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Mô tả</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Mô tả vai trò và nhiệm vụ..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={submitting}
                      >
                        Hủy
                      </Button>
                      <Button onClick={handleSaveRole} disabled={submitting}>
                        {submitting
                          ? "Đang xử lý..."
                          : editingRole
                          ? "Cập nhật"
                          : "Tạo mới"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                Các vai trò tùy chỉnh cho câu lạc bộ của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-card border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-2 w-2 rounded-full" />
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Skeleton className="h-9 w-9" />
                          <Skeleton className="h-9 w-9" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : clubRoles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có role nào. Hãy tạo role đầu tiên!
                </div>
              ) : (
                <div className="space-y-2">
                  {clubRoles.map((role) => (
                    <div
                      key={role.id}
                      className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={`h-2 w-2 rounded-full ${getRoleLevelColor(
                                role.roleLevel
                              )}`}
                            />
                            <h3 className="font-semibold text-foreground">
                              {role.roleName}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              Level {role.roleLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {role.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {role.systemRoleName}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(role)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(role)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Xác nhận xóa role
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa role "{roleToDelete?.roleName}"?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Hành động này không thể hoàn tác. Role sẽ bị xóa vĩnh viễn và
                tất cả thành viên có role này sẽ cần được chỉ định role mới.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setRoleToDelete(null);
                }}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={submitting}
              >
                {submitting ? "Đang xóa..." : "Xóa role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
