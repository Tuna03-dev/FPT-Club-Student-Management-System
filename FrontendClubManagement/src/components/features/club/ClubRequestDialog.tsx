import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Users,
  Calendar,
  Mail,
  Phone,
} from "lucide-react";
import type { ClubRequest } from "./ClubRequestCard";

interface ClubRequestDialogProps {
  request: ClubRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WorkflowStep {
  id: number;
  label: string;
  description: string;
  icon: React.ElementType;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    label: "Nộp đơn",
    description: "Gửi đơn đăng ký thành lập CLB",
    icon: FileText,
  },
  {
    id: 2,
    label: "Xét duyệt đơn",
    description: "Ban quản lý xem xét đơn đăng ký",
    icon: Clock,
  },
  {
    id: 3,
    label: "Bổ sung hồ sơ",
    description: "Nộp các giấy tờ bổ sung nếu cần",
    icon: FileText,
  },
  {
    id: 4,
    label: "Phỏng vấn",
    description: "Tham gia phỏng vấn với ban quản lý",
    icon: Users,
  },
  {
    id: 5,
    label: "Chuẩn bị bảo vệ",
    description: "Chuẩn bị kế hoạch hoạt động và slide",
    icon: FileText,
  },
  {
    id: 6,
    label: "Lên lịch bảo vệ",
    description: "Xác nhận lịch bảo vệ đề án",
    icon: Calendar,
  },
  {
    id: 7,
    label: "Bảo vệ đề án",
    description: "Trình bày kế hoạch trước hội đồng",
    icon: Users,
  },
  {
    id: 8,
    label: "Hoàn tất",
    description: "Nhận quyết định phê duyệt",
    icon: CheckCircle2,
  },
];

export function ClubRequestDialog({
  request,
  open,
  onOpenChange,
}: ClubRequestDialogProps) {
  if (!request) return null;

  const progress = (request.currentStep / request.totalSteps) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{request.clubName}</DialogTitle>
          <DialogDescription>
            Mã CLB: {request.clubCode} • Ngày gửi:{" "}
            {new Date(request.submittedDate).toLocaleDateString("vi-VN")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tiến độ xử lý</h3>
              <Badge variant="outline">
                Bước {request.currentStep}/{request.totalSteps}
              </Badge>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              Hoàn thành {Math.round(progress)}%
            </p>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold">Quy trình xét duyệt</h3>
            <div className="space-y-4">
              {WORKFLOW_STEPS.map((step) => {
                const isCompleted = step.id < request.currentStep;
                const isCurrent = step.id === request.currentStep;
                const StepIcon = step.icon;

                return (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-2 ${
                          isCompleted
                            ? "bg-green-100 text-green-600"
                            : isCurrent
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isCurrent ? (
                          <StepIcon className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      {step.id < WORKFLOW_STEPS.length && (
                        <div
                          className={`w-0.5 h-12 ${
                            isCompleted ? "bg-green-200" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <h4
                        className={`font-medium ${
                          isCurrent ? "text-blue-600" : ""
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Additional Info */}
          <div className="space-y-3">
            <h3 className="font-semibold">Thông tin chi tiết</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {request.defenseDate && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">
                      Lịch bảo vệ
                    </p>
                    <p className="text-sm text-purple-700">
                      {new Date(request.defenseDate).toLocaleDateString(
                        "vi-VN"
                      )}
                    </p>
                  </div>
                </div>
              )}

              {request.reviewer && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Người xét duyệt
                    </p>
                    <p className="text-sm text-blue-700">{request.reviewer}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-700">contact@club.edu.vn</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Số điện thoại
                  </p>
                  <p className="text-sm text-gray-700">0123456789</p>
                </div>
              </div>
            </div>
          </div>

          {request.status === "rejected" && request.rejectionReason && (
            <>
              <Separator />
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">
                  Lý do từ chối
                </h3>
                <p className="text-sm text-red-700">
                  {request.rejectionReason}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
