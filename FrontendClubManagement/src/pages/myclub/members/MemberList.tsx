import { useState } from "react";
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

import { toast } from "sonner";

// Mock Club Roles
export interface ClubRole {
  id: number;
  roleName: string;
  roleCode: string;
  description: string;
  roleLevel: number;
  systemRoleId: number;
  systemRoleName: string;
}

// Member interface
export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  status: string;
  totalScore: number;
  attendanceRate: number;
  joinDate: string;
  lastActive: string;
  totalTerms: number;
  currentTerm: {
    name: string;
    contributionScore: number;
    attendanceRate: number;
    role: string;
    status: string;
    department: string;
  };
  history: Array<{
    term: string;
    role: string;
    status: string;
    score: number;
    attendance: number;
    department: string;
    date: string;
  }>;
}

const mockClubRoles: ClubRole[] = [
  {
    id: 1,
    roleName: "Chủ tịch CLB",
    roleCode: "club_president",
    description: "Lãnh đạo và điều hành toàn bộ hoạt động của CLB",
    roleLevel: 1,
    systemRoleId: 3,
    systemRoleName: "Club Officer",
  },
  {
    id: 2,
    roleName: "Phó chủ tịch",
    roleCode: "vice_president",
    description: "Hỗ trợ chủ tịch điều hành CLB",
    roleLevel: 2,
    systemRoleId: 3,
    systemRoleName: "Club Officer",
  },
  {
    id: 3,
    roleName: "Trưởng ban Truyền thông",
    roleCode: "head_pr",
    description: "Quản lý hoạt động truyền thông và marketing",
    roleLevel: 3,
    systemRoleId: 4,
    systemRoleName: "Team Officer",
  },
  {
    id: 4,
    roleName: "Trưởng ban Tổ chức",
    roleCode: "head_event",
    description: "Quản lý và tổ chức các sự kiện",
    roleLevel: 3,
    systemRoleId: 4,
    systemRoleName: "Team Officer",
  },
  {
    id: 5,
    roleName: "Trưởng ban",
    roleCode: "team_head",
    description: "Quản lý một ban trong CLB",
    roleLevel: 3,
    systemRoleId: 4,
    systemRoleName: "Team Officer",
  },
  {
    id: 6,
    roleName: "Thành viên cốt cán",
    roleCode: "core_member",
    description: "Thành viên tích cực tham gia hoạt động",
    roleLevel: 4,
    systemRoleId: 6,
    systemRoleName: "Member",
  },
  {
    id: 7,
    roleName: "Thành viên",
    roleCode: "member",
    description: "Thành viên thường của CLB",
    roleLevel: 5,
    systemRoleId: 6,
    systemRoleName: "Member",
  },
];

// Mock data
const mockMembers = [
  {
    id: "SE160001",
    name: "Nguyễn Văn A",
    email: "nguyenvana@fpt.edu.vn",
    phone: "0123456789",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    role: "Phó chủ tịch",
    status: "Đang hoạt động",
    totalScore: 450,
    attendanceRate: 92,
    joinDate: "1/9/2022",
    lastActive: "15/1/2024",
    totalTerms: 6,
    currentTerm: {
      name: "Fall 2024",
      contributionScore: 95,
      attendanceRate: 95,
      role: "Phó chủ tịch",
      status: "Đang hoạt động",
      department: "Ban chủ nhiệm",
    },
    history: [
      {
        term: "Summer 2024",
        role: "Trưởng ban",
        status: "Đang hoạt động",
        score: 87,
        attendance: 90,
        department: "Ban kỹ thuật",
        date: "1/5/2024",
      },
      {
        term: "Spring 2024",
        role: "Thành viên cốt cán",
        status: "Đang hoạt động",
        score: 78,
        attendance: 88,
        department: "Ban kỹ thuật",
        date: "1/1/2024",
      },
      {
        term: "Fall 2023",
        role: "Thành viên cốt cán",
        status: "Đang hoạt động",
        score: 82,
        attendance: 92,
        department: "Ban học thuật",
        date: "1/9/2023",
      },
    ],
  },
  {
    id: "SE160002",
    name: "Trần Thị B",
    email: "tranthib@fpt.edu.vn",
    phone: "0987654321",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
    role: "Trưởng ban",
    status: "Đang hoạt động",
    totalScore: 420,
    attendanceRate: 88,
    joinDate: "1/9/2022",
    lastActive: "14/1/2024",
    totalTerms: 5,
    currentTerm: {
      name: "Fall 2024",
      contributionScore: 90,
      attendanceRate: 90,
      role: "Trưởng ban",
      status: "Đang hoạt động",
      department: "Ban truyền thông",
    },
    history: [
      {
        term: "Summer 2024",
        role: "Phó ban",
        status: "Đang hoạt động",
        score: 85,
        attendance: 87,
        department: "Ban truyền thông",
        date: "1/5/2024",
      },
      {
        term: "Spring 2024",
        role: "Thành viên",
        status: "Đang hoạt động",
        score: 80,
        attendance: 86,
        department: "Ban truyền thông",
        date: "1/1/2024",
      },
    ],
  },
  {
    id: "SE160003",
    name: "Lê Văn C",
    email: "levanc@fpt.edu.vn",
    phone: "0912345678",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
    role: "Thành viên",
    status: "Tạm nghỉ",
    totalScore: 320,
    attendanceRate: 75,
    joinDate: "1/1/2023",
    lastActive: "1/12/2023",
    totalTerms: 4,
    currentTerm: {
      name: "Fall 2024",
      contributionScore: 0,
      attendanceRate: 0,
      role: "Thành viên",
      status: "Tạm nghỉ",
      department: "Ban sự kiện",
    },
    history: [
      {
        term: "Spring 2024",
        role: "Thành viên",
        status: "Đang hoạt động",
        score: 75,
        attendance: 82,
        department: "Ban sự kiện",
        date: "1/1/2024",
      },
      {
        term: "Fall 2023",
        role: "Thành viên",
        status: "Đang hoạt động",
        score: 80,
        attendance: 85,
        department: "Ban sự kiện",
        date: "1/9/2023",
      },
    ],
  },
];

const Members = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedMember, setSelectedMember] = useState<
    (typeof mockMembers)[0] | null
  >(null);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [selectedMemberRole, setSelectedMemberRole] = useState<string>("");

  const filteredMembers = mockMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || member.status === selectedStatus;
    const matchesRole = selectedRole === "all" || member.role === selectedRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      "Phó chủ tịch": "bg-primary/10 text-primary border-primary/20",
      "Trưởng ban": "bg-purple-500/10 text-purple-600 border-purple-500/20",
      "Phó ban": "bg-blue-500/10 text-blue-600 border-blue-500/20",
      "Thành viên cốt cán": "bg-blue-500/10 text-blue-600 border-blue-500/20",
      "Thành viên": "bg-muted text-muted-foreground border-muted",
    };
    return roleColors[role] || "bg-muted text-muted-foreground border-muted";
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      "Đang hoạt động": "bg-green-500/10 text-green-600 border-green-500/20",
      "Tạm nghỉ": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      "Đã nghỉ": "bg-red-500/10 text-red-600 border-red-500/20",
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

    // Update role in mock data (in real app, this would be an API call)
    if (selectedMember) {
      selectedMember.role = selectedMemberRole;
      toast.success("Cập nhật vai trò thành công");
      setIsEditRoleOpen(false);
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
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                Quản lý thành viên
              </h1>
              <p className="text-muted-foreground mt-1">
                <span className="font-semibold text-primary">
                  {filteredMembers.length}
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
                  <SelectValue placeholder="Tất cả kỳ học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kỳ học</SelectItem>
                  <SelectItem value="fall2024">Fall 2024</SelectItem>
                  <SelectItem value="summer2024">Summer 2024</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="border-primary/20">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="Đang hoạt động">Đang hoạt động</SelectItem>
                  <SelectItem value="Tạm nghỉ">Tạm nghỉ</SelectItem>
                  <SelectItem value="Đã nghỉ">Đã nghỉ</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="border-primary/20">
                  <SelectValue placeholder="Tất cả vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="Phó chủ tịch">Phó chủ tịch</SelectItem>
                  <SelectItem value="Trưởng ban">Trưởng ban</SelectItem>
                  <SelectItem value="Thành viên">Thành viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <div className="space-y-4">
          {filteredMembers.map((member) => (
            <Card
              key={member.id}
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
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                          {member.name.split(" ").pop()?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{member.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {member.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                        <Badge className={getStatusColor(member.status)}>
                          {member.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 sm:gap-6 flex-wrap lg:flex-nowrap">
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20 min-w-[70px]">
                      <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                        {member.totalScore}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        điểm tổng
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20 min-w-[70px]">
                      <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                        {member.attendanceRate}%
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

        {/* Edit Role Dialog */}
        <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Chỉnh sửa vai trò
              </DialogTitle>
              <DialogDescription>
                Cập nhật vai trò cho {selectedMember?.name}
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
                    {mockClubRoles.map((role) => (
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
                      mockClubRoles.find(
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
