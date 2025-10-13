import { Mail, Award, TrendingUp, Clock, Edit2 } from "lucide-react";
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

// Import Member interface from MemberList
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

interface MemberDetailDialogProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

const MemberDetailDialog = ({
  member,
  isOpen,
  onClose,
}: MemberDetailDialogProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] md:min-w-2xl min-w-[320px] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30">
              <AvatarImage src={member?.avatar} alt={member?.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                {member?.name.split(" ").pop()?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {member?.name}
              </div>
              <div className="text-sm text-muted-foreground font-normal">
                {member?.id}
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
                    <span className="font-semibold">{member.id}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-semibold text-right">
                      {member.email}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">SĐT:</span>
                    <span className="font-semibold">{member.phone}</span>
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
                    <span className="text-muted-foreground">
                      Tổng điểm đóng góp:
                    </span>
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      {member.totalScore}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Điểm danh TB:</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      {member.attendanceRate}%
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
                    <Badge className={getRoleColor(member.currentTerm.role)}>
                      {member.currentTerm.role}
                    </Badge>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <Badge className={getStatusColor(member.status)}>
                      {member.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Term */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary-glow/5 to-primary/5 shadow-glow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                    <TrendingUp className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    Kỳ hiện tại: {member.currentTerm.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-2">
                    Điểm đóng góp
                  </div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex items-center justify-center gap-1">
                    {member.currentTerm.contributionScore}
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-2">
                    Điểm danh
                  </div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex items-center justify-center gap-1">
                    {member.currentTerm.attendanceRate}%
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-2">
                    Vai trò
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-sm font-medium">
                      {member.currentTerm.role}
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
                  <Badge className={getStatusColor(member.currentTerm.status)}>
                    {member.currentTerm.status}
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
                              {term.term}
                            </span>
                            <Badge className={getRoleColor(term.role)}>
                              {term.role}
                            </Badge>
                            <Badge className={getStatusColor(term.status)}>
                              {term.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="font-medium">
                              Ban: {term.department}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {term.date}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20 min-w-[70px]">
                            <div className="text-lg font-bold text-primary">
                              {term.score}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              điểm
                            </div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20 min-w-[70px]">
                            <div className="text-lg font-bold text-primary">
                              {term.attendance}%
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
