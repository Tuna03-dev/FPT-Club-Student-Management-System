import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Send,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ClubRequest {
  id: string;
  clubName: string;
  description: string;
  category: string;
  requestedBy: string;
  requestedAt: string;
  status:
    | "draft"
    | "submitted"
    | "initial_review"
    | "proposal_required"
    | "proposal_submitted"
    | "proposal_approved"
    | "defense_proposal_submitted"
    | "defense_scheduled"
    | "defense_completed"
    | "approved"
    | "rejected";
  currentStep: number;
  totalSteps: number;
  staffNote?: string;
  proposalFile?: string;
  defenseDate?: string;
  defenseLocation?: string;
  rejectionReason?: string;
}

const WORKFLOW_STEPS = [
  { id: 1, title: "Gửi yêu cầu", description: "Sinh viên gửi yêu cầu tạo CLB" },
  { id: 2, title: "Xem xét ban đầu", description: "Staff xem xét yêu cầu" },
  { id: 3, title: "Gửi đề án", description: "Gửi đề án chi tiết" },
  { id: 4, title: "Duyệt đề án", description: "Staff duyệt đề án" },
  {
    id: 5,
    title: "Đề xuất lịch bảo vệ",
    description: "Sinh viên đề xuất thời gian bảo vệ",
  },
  { id: 6, title: "Duyệt lịch bảo vệ", description: "Staff duyệt lịch bảo vệ" },
  { id: 7, title: "Bảo vệ offline", description: "Thực hiện bảo vệ đề án" },
  { id: 8, title: "Hoàn thành", description: "CLB được tạo thành công" },
];

const CreateClubPage = () => {
  const [activeTab, setActiveTab] = useState("create");

  const [clubRequests, setClubRequests] = useState<ClubRequest[]>([
    {
      id: "1",
      clubName: "CLB Trí tuệ nhân tạo",
      description: "Câu lạc bộ nghiên cứu và phát triển các ứng dụng AI",
      category: "Công nghệ",
      requestedBy: "Nguyễn Văn A",
      requestedAt: "2024-01-15",
      status: "defense_scheduled",
      currentStep: 6,
      totalSteps: 8,
      staffNote: "Đề án được duyệt. Vui lòng chuẩn bị bảo vệ.",
      proposalFile: "ai-club-proposal.pdf",
      defenseDate: "2024-02-20",
      defenseLocation: "Phòng họp A301",
    },
    {
      id: "2",
      clubName: "CLB Blockchain",
      description: "Nghiên cứu công nghệ blockchain và cryptocurrency",
      category: "Công nghệ",
      requestedBy: "Trần Thị B",
      requestedAt: "2024-01-18",
      status: "proposal_required",
      currentStep: 3,
      totalSteps: 8,
      staffNote:
        "Yêu cầu ban đầu được chấp nhận. Vui lòng gửi đề án chi tiết trong vòng 2 tuần.",
    },
    {
      id: "3",
      clubName: "CLB Game Development",
      description: "Phát triển game và ứng dụng giải trí",
      category: "Công nghệ",
      requestedBy: "Lê Văn C",
      requestedAt: "2024-01-10",
      status: "rejected",
      currentStep: 2,
      totalSteps: 8,
      rejectionReason:
        "Đã có CLB tương tự hoạt động. Đề xuất tham gia CLB Lập trình hiện có.",
    },
  ]);

  const [formData, setFormData] = useState({
    clubName: "",
    description: "",
    category: "",
    objectives: "",
    activities: "",
    targetMembers: "",
    defenseDate: "",
    defenseTime: "",
    defenseLocation: "",
    defenseNote: "",
  });

  const handleSubmitRequest = () => {
    const newRequest: ClubRequest = {
      id: Date.now().toString(),
      clubName: formData.clubName,
      description: formData.description,
      category: formData.category,
      requestedBy: "Current User",
      requestedAt: new Date().toISOString().split("T")[0],
      status: "submitted",
      currentStep: 1,
      totalSteps: 8,
    };

    setClubRequests([newRequest, ...clubRequests]);
    setFormData({
      clubName: "",
      description: "",
      category: "",
      objectives: "",
      activities: "",
      targetMembers: "",
      defenseDate: "",
      defenseTime: "",
      defenseLocation: "",
      defenseNote: "",
    });

    toast.success("Gửi yêu cầu thành công!", {
      description:
        "Yêu cầu tạo CLB của bạn đã được gửi. Staff sẽ xem xét trong vòng 3-5 ngày.",
    });

    setActiveTab("pending");
  };

  const handleScheduleDefense = (requestId: string) => {
    const updatedRequests = clubRequests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            defenseDate: formData.defenseDate,
            defenseLocation: formData.defenseLocation,
            status: "defense_proposal_submitted" as const,
            currentStep: 5,
          }
        : request
    );
    setClubRequests(updatedRequests);
    setFormData({
      ...formData,
      defenseDate: "",
      defenseTime: "",
      defenseLocation: "",
      defenseNote: "",
    });

    toast.success("Đề xuất lịch bảo vệ thành công!", {
      description:
        "Đề xuất của bạn đã được gửi. Staff sẽ xem xét và phản hồi sớm nhất.",
    });
  };

  const getStatusBadge = (status: ClubRequest["status"]) => {
    const statusConfig = {
      draft: {
        label: "Bản nháp",
        variant: "secondary" as const,
        color: "bg-muted text-muted-foreground",
      },
      submitted: {
        label: "Đã gửi",
        variant: "default" as const,
        color: "bg-primary/10 text-primary",
      },
      initial_review: {
        label: "Đang xem xét",
        variant: "default" as const,
        color: "bg-secondary text-secondary-foreground",
      },
      proposal_required: {
        label: "Cần đề án",
        variant: "default" as const,
        color: "bg-accent text-accent-foreground",
      },
      proposal_submitted: {
        label: "Đã gửi đề án",
        variant: "default" as const,
        color: "bg-primary/10 text-primary",
      },
      proposal_approved: {
        label: "Đề án được duyệt",
        variant: "default" as const,
        color: "bg-primary text-primary-foreground",
      },
      defense_proposal_submitted: {
        label: "Đã đề xuất lịch bảo vệ",
        variant: "default" as const,
        color: "bg-secondary text-secondary-foreground",
      },
      defense_scheduled: {
        label: "Lịch bảo vệ đã duyệt",
        variant: "default" as const,
        color: "bg-primary text-primary-foreground",
      },
      defense_completed: {
        label: "Đã bảo vệ",
        variant: "default" as const,
        color: "bg-primary text-primary-foreground",
      },
      approved: {
        label: "Đã duyệt",
        variant: "default" as const,
        color: "bg-primary text-primary-foreground",
      },
      rejected: {
        label: "Từ chối",
        variant: "destructive" as const,
        color: "bg-destructive text-destructive-foreground",
      },
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getProgressPercentage = (currentStep: number, totalSteps: number) => {
    return (currentStep / totalSteps) * 100;
  };

  const renderWorkflowProgress = (request: ClubRequest) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Tiến độ: {request.currentStep}/{request.totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(
              getProgressPercentage(request.currentStep, request.totalSteps)
            )}
            %
          </span>
        </div>
        <Progress
          value={getProgressPercentage(request.currentStep, request.totalSteps)}
          className="h-2"
        />

        <div className="space-y-3">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                step.id < request.currentStep
                  ? "bg-primary/5 border-primary/20"
                  : step.id === request.currentStep
                  ? "bg-secondary border-border"
                  : "bg-muted/50 border-border"
              }`}
            >
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.id < request.currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id === request.currentStep
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id < request.currentStep ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <div className="flex-1">
                <h4
                  className={`font-medium ${
                    step.id <= request.currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </h4>
                <p
                  className={`text-sm ${
                    step.id <= request.currentStep
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const filteredRequests = (statuses: ClubRequest["status"][]) =>
    clubRequests.filter((request) => statuses.includes(request.status));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Đăng ký thành lập CLB
          </h1>
          <p className="text-muted-foreground">
            Quy trình đăng ký tạo câu lạc bộ mới tại trường
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create">Tạo yêu cầu</TabsTrigger>
            <TabsTrigger value="pending">
              Đang xử lý (
              {
                filteredRequests([
                  "submitted",
                  "initial_review",
                  "proposal_required",
                  "proposal_submitted",
                  "proposal_approved",
                  "defense_proposal_submitted",
                  "defense_scheduled",
                ]).length
              }
              )
            </TabsTrigger>
            <TabsTrigger value="completed">
              Hoàn thành ({filteredRequests(["approved"]).length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Từ chối ({filteredRequests(["rejected"]).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Tạo yêu cầu thành lập CLB mới
                </CardTitle>
                <CardDescription>
                  Điền thông tin chi tiết về câu lạc bộ bạn muốn thành lập
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clubName">Tên câu lạc bộ</Label>
                    <Input
                      id="clubName"
                      value={formData.clubName}
                      onChange={(e) =>
                        setFormData({ ...formData, clubName: e.target.value })
                      }
                      placeholder="Nhập tên CLB..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Lĩnh vực</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn lĩnh vực" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Công nghệ</SelectItem>
                        <SelectItem value="business">Kinh doanh</SelectItem>
                        <SelectItem value="arts">Nghệ thuật</SelectItem>
                        <SelectItem value="sports">Thể thao</SelectItem>
                        <SelectItem value="social">Xã hội</SelectItem>
                        <SelectItem value="academic">Học thuật</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả câu lạc bộ</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Mô tả ngắn gọn về CLB..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Mục tiêu hoạt động</Label>
                  <Textarea
                    id="objectives"
                    value={formData.objectives}
                    onChange={(e) =>
                      setFormData({ ...formData, objectives: e.target.value })
                    }
                    placeholder="Các mục tiêu chính của CLB..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activities">Hoạt động dự kiến</Label>
                  <Textarea
                    id="activities"
                    value={formData.activities}
                    onChange={(e) =>
                      setFormData({ ...formData, activities: e.target.value })
                    }
                    placeholder="Các hoạt động CLB sẽ tổ chức..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetMembers">Số thành viên dự kiến</Label>
                  <Input
                    id="targetMembers"
                    value={formData.targetMembers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetMembers: e.target.value,
                      })
                    }
                    placeholder="Ví dụ: 30-50 thành viên"
                  />
                </div>

                <Separator />

                <div className="bg-secondary/50 p-4 rounded-lg border">
                  <h4 className="font-medium text-foreground mb-2">
                    Quy trình tạo CLB
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Gửi yêu cầu tạo CLB với thông tin cơ bản</p>
                    <p>2. Staff xem xét và phản hồi trong vòng 3-5 ngày</p>
                    <p>3. Nếu được chấp nhận, gửi đề án chi tiết</p>
                    <p>4. Staff duyệt đề án</p>
                    <p>5. Đề xuất thời gian bảo vệ đề án</p>
                    <p>6. Staff xác nhận lịch bảo vệ</p>
                    <p>7. Thực hiện bảo vệ đề án offline</p>
                    <p>8. CLB được tạo thành công sau khi bảo vệ</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={
                      !formData.clubName ||
                      !formData.description ||
                      !formData.category
                    }
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Gửi yêu cầu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {filteredRequests([
              "submitted",
              "initial_review",
              "proposal_required",
              "proposal_submitted",
              "proposal_approved",
              "defense_proposal_submitted",
              "defense_scheduled",
            ]).map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {request.clubName}
                        </CardTitle>
                        {getStatusBadge(request.status)}
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {request.requestedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {request.requestedAt}
                        </span>
                        <Badge variant="outline">{request.category}</Badge>
                      </CardDescription>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Chi tiết
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{request.clubName}</DialogTitle>
                          <DialogDescription>
                            Theo dõi tiến độ tạo câu lạc bộ
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-medium mb-2">Mô tả</h4>
                            <p className="text-muted-foreground">
                              {request.description}
                            </p>
                          </div>

                          <Separator />

                          <div>
                            <h4 className="font-medium mb-4">Tiến độ xử lý</h4>
                            {renderWorkflowProgress(request)}
                          </div>

                          {request.staffNote && (
                            <>
                              <Separator />
                              <div className="bg-secondary/50 p-4 rounded-lg border">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 mt-0.5 text-foreground" />
                                  <div>
                                    <p className="text-sm font-medium text-foreground">
                                      Ghi chú từ Staff:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {request.staffNote}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {request.defenseDate &&
                            request.status === "defense_scheduled" && (
                              <>
                                <Separator />
                                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                                  <h4 className="font-medium text-foreground mb-2">
                                    Thông tin bảo vệ
                                  </h4>
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <p>
                                      <strong>Ngày:</strong>{" "}
                                      {request.defenseDate}
                                    </p>
                                    <p>
                                      <strong>Địa điểm:</strong>{" "}
                                      {request.defenseLocation}
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}

                          {request.status === "proposal_required" && (
                            <div className="flex gap-2">
                              <Button>
                                <Upload className="h-4 w-4 mr-2" />
                                Tải lên đề án
                              </Button>
                            </div>
                          )}

                          {request.status === "proposal_approved" && (
                            <>
                              <Separator />
                              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                                <h4 className="font-medium text-foreground mb-3">
                                  Lên lịch bảo vệ đề án
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                  Đề án của bạn đã được duyệt. Vui lòng đề xuất
                                  thời gian bảo vệ để Staff xem xét.
                                </p>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label htmlFor="defenseDate">
                                        Ngày bảo vệ đề xuất
                                      </Label>
                                      <Input
                                        id="defenseDate"
                                        type="date"
                                        min={
                                          new Date().toISOString().split("T")[0]
                                        }
                                        value={formData.defenseDate}
                                        onChange={(e) =>
                                          setFormData({
                                            ...formData,
                                            defenseDate: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="defenseTime">
                                        Giờ bảo vệ
                                      </Label>
                                      <Select
                                        value={formData.defenseTime}
                                        onValueChange={(value) =>
                                          setFormData({
                                            ...formData,
                                            defenseTime: value,
                                          })
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Chọn giờ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="08:00">
                                            08:00 - 09:30
                                          </SelectItem>
                                          <SelectItem value="09:45">
                                            09:45 - 11:15
                                          </SelectItem>
                                          <SelectItem value="13:30">
                                            13:30 - 15:00
                                          </SelectItem>
                                          <SelectItem value="15:15">
                                            15:15 - 16:45
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="defenseLocation">
                                      Địa điểm đề xuất
                                    </Label>
                                    <Select
                                      value={formData.defenseLocation}
                                      onValueChange={(value) =>
                                        setFormData({
                                          ...formData,
                                          defenseLocation: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Chọn phòng" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="A301">
                                          Phòng họp A301
                                        </SelectItem>
                                        <SelectItem value="A302">
                                          Phòng họp A302
                                        </SelectItem>
                                        <SelectItem value="B201">
                                          Phòng họp B201
                                        </SelectItem>
                                        <SelectItem value="B202">
                                          Phòng họp B202
                                        </SelectItem>
                                        <SelectItem value="C101">
                                          Hội trường C101
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="defenseNote">
                                      Ghi chú (tùy chọn)
                                    </Label>
                                    <Textarea
                                      id="defenseNote"
                                      placeholder="Các yêu cầu đặc biệt hoặc ghi chú thêm..."
                                      rows={2}
                                      value={formData.defenseNote}
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,
                                          defenseNote: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <Button
                                    className="w-full"
                                    onClick={() =>
                                      handleScheduleDefense(request.id)
                                    }
                                    disabled={
                                      !formData.defenseDate ||
                                      !formData.defenseLocation
                                    }
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Gửi đề xuất lịch bảo vệ
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}

                          {request.status === "defense_proposal_submitted" && (
                            <>
                              <Separator />
                              <div className="bg-secondary/50 p-4 rounded-lg border">
                                <h4 className="font-medium text-foreground mb-3">
                                  Đã đề xuất lịch bảo vệ
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Đề xuất lịch bảo vệ của bạn đã được gửi. Staff
                                  sẽ xem xét và phản hồi sớm nhất.
                                </p>
                                <div className="bg-background p-3 rounded-lg space-y-2 text-sm">
                                  <div>
                                    <strong className="text-foreground">
                                      Ngày đề xuất:
                                    </strong>
                                    <span className="text-muted-foreground ml-2">
                                      {request.defenseDate}
                                    </span>
                                  </div>
                                  <div>
                                    <strong className="text-foreground">
                                      Địa điểm đề xuất:
                                    </strong>
                                    <span className="text-muted-foreground ml-2">
                                      {request.defenseLocation}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>Đang chờ Staff xác nhận</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2 mb-4">
                    {request.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Tiến độ:</span>
                      <span className="text-muted-foreground">
                        {request.currentStep}/{request.totalSteps} bước
                      </span>
                    </div>
                    <Progress
                      value={getProgressPercentage(
                        request.currentStep,
                        request.totalSteps
                      )}
                      className="h-2"
                    />
                  </div>

                  {request.staffNote && (
                    <div className="mt-4 p-3 bg-secondary/50 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Cập nhật mới nhất:</strong> {request.staffNote}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredRequests([
              "submitted",
              "initial_review",
              "proposal_required",
              "proposal_submitted",
              "proposal_approved",
              "defense_scheduled",
            ]).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Không có yêu cầu nào đang xử lý
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filteredRequests(["approved"]).map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {request.clubName}
                        </CardTitle>
                        {getStatusBadge(request.status)}
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {request.requestedBy}
                        </span>
                        <Badge variant="outline">{request.category}</Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2 mb-4">
                    {request.description}
                  </p>
                  <div className="bg-primary/5 p-3 border border-primary/20 rounded-lg">
                    <p className="text-sm text-foreground">
                      <strong>Chúc mừng!</strong> Câu lạc bộ đã được tạo thành
                      công và có thể bắt đầu hoạt động.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredRequests(["approved"]).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Chưa có CLB nào được tạo thành công
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {filteredRequests(["rejected"]).map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {request.clubName}
                        </CardTitle>
                        {getStatusBadge(request.status)}
                        <XCircle className="h-5 w-5 text-destructive" />
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {request.requestedBy}
                        </span>
                        <Badge variant="outline">{request.category}</Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2 mb-4">
                    {request.description}
                  </p>
                  {request.rejectionReason && (
                    <div className="bg-destructive/10 p-3 border border-destructive/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-destructive" />
                        <div>
                          <p className="text-sm font-medium text-destructive">
                            Lý do từ chối:
                          </p>
                          <p className="text-sm text-destructive/90">
                            {request.rejectionReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredRequests(["rejected"]).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Không có yêu cầu nào bị từ chối
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateClubPage;
