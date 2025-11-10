import { useState } from "react";
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
import { Plus, Edit2, Trash2, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import {
  mockSystemRoles,
  mockClubRoles as initialClubRoles,
  type ClubRole,
} from "@/data/mockRoles";

export default function RoleManagement() {
  const [clubRoles, setClubRoles] = useState<ClubRole[]>(initialClubRoles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ClubRole | null>(null);
  const [formData, setFormData] = useState({
    roleName: "",
    roleCode: "",
    description: "",
    roleLevel: 1,
    systemRoleId: 0,
  });

  const handleOpenDialog = (role?: ClubRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        roleName: role.roleName,
        roleCode: role.roleCode || "",
        description: role.description || "",
        roleLevel: role.roleLevel,
        systemRoleId: role.systemRoleId,
      });
    } else {
      setEditingRole(null);
      setFormData({
        roleName: "",
        roleCode: "",
        description: "",
        roleLevel: 1,
        systemRoleId: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!formData.roleName || !formData.roleCode || !formData.systemRoleId) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const systemRole = mockSystemRoles.find(
      (r) => r.id === formData.systemRoleId
    );

    if (editingRole) {
      setClubRoles((prev) =>
        prev.map((role) =>
          role.id === editingRole.id
            ? {
                ...role,
                ...formData,
                systemRoleName: systemRole?.roleName || "",
              }
            : role
        )
      );
      toast.success("Cập nhật role thành công");
    } else {
      const newRole: ClubRole = {
        id: Math.max(...clubRoles.map((r) => r.id)) + 1,
        ...formData,
        systemRoleName: systemRole?.roleName || "",
      };
      setClubRoles((prev) => [...prev, newRole]);
      toast.success("Tạo role mới thành công");
    }

    setIsDialogOpen(false);
  };

  const handleDeleteRole = (roleId: number) => {
    setClubRoles((prev) => prev.filter((role) => role.id !== roleId));
    toast.success("Xóa role thành công");
  };

  const getRoleLevelColor = (level: number) => {
    if (level === 1) return "bg-red-500";
    if (level === 2) return "bg-orange-500";
    if (level === 3) return "bg-blue-500";
    return "bg-green-500";
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
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              roleName: e.target.value,
                            })
                          }
                          placeholder="VD: Chủ tịch CLB"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roleCode">Mã role *</Label>
                        <Input
                          id="roleCode"
                          value={formData.roleCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              roleCode: e.target.value,
                            })
                          }
                          placeholder="VD: club_president"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="systemRole">System Role *</Label>
                        <Select
                          value={formData.systemRoleId.toString()}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              systemRoleId: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn system role" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockSystemRoles.map((role) => (
                              <SelectItem
                                key={role.id}
                                value={role.id.toString()}
                              >
                                {role.roleName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roleLevel">Cấp độ</Label>
                        <Input
                          id="roleLevel"
                          type="number"
                          min="1"
                          value={formData.roleLevel}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              roleLevel: parseInt(e.target.value),
                            })
                          }
                        />
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
                      >
                        Hủy
                      </Button>
                      <Button onClick={handleSaveRole}>
                        {editingRole ? "Cập nhật" : "Tạo mới"}
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
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {role.systemRoleName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {role.roleCode}
                          </span>
                        </div>
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
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
