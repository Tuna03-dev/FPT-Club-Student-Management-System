import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  XCircle,
} from "lucide-react";
import type { RequestEstablishmentResponse } from "@/api/clubCreation";

export interface ClubRequest {
  id: string;
  clubName: string;
  clubCode: string;
  submittedDate: string;
  rawStatus: RequestEstablishmentResponse["status"];
  status:
    | "draft"
    | "pending_review"
    | "under_review"
    | "pending_documents"
    | "documents_submitted"
    | "defense_scheduled"
    | "defense_schedule_approved"
    | "defense_completed"
    | "final_form_submitted"
    | "approved"
    | "rejected"
    | "revision_required"
    | "withdrawn";
  currentStep: number;
  totalSteps: number;
  rejectionReason?: string;
  defenseDate?: string;
  reviewer?: string;
}

interface ClubRequestCardProps {
  request: ClubRequest;
  onViewDetails: (request: ClubRequest) => void;
}

const STATUS_CONFIG = {
  draft: {
    label: "Nháp",
    variant: "secondary" as const,
    icon: FileText,
    color: "text-gray-500",
  },
  pending_review: {
    label: "Chờ xét duyệt",
    variant: "default" as const,
    icon: Clock,
    color: "text-blue-500",
  },
  under_review: {
    label: "Đang xét duyệt",
    variant: "default" as const,
    icon: Clock,
    color: "text-yellow-500",
  },
  pending_documents: {
    label: "Chờ bổ sung hồ sơ",
    variant: "secondary" as const,
    icon: FileText,
    color: "text-orange-500",
  },
  documents_submitted: {
    label: "Đã nộp hồ sơ",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-500",
  },
  defense_scheduled: {
    label: "Đã lên lịch bảo vệ",
    variant: "default" as const,
    icon: Calendar,
    color: "text-purple-500",
  },
  defense_schedule_approved: {
    label: "Đã duyệt lịch bảo vệ",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-500",
  },
  defense_completed: {
    label: "Đã bảo vệ",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-500",
  },
  final_form_submitted: {
    label: "Đã nộp Hồ sơ hoàn thiện",
    variant: "default" as const,
    icon: FileText,
    color: "text-green-600",
  },
  approved: {
    label: "Đã phê duyệt",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-600",
  },
  rejected: {
    label: "Bị từ chối",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-500",
  },
  revision_required: {
    label: "Cần chỉnh sửa",
    variant: "secondary" as const,
    icon: FileText,
    color: "text-orange-500",
  },
  withdrawn: {
    label: "Đã rút đơn",
    variant: "secondary" as const,
    icon: XCircle,
    color: "text-gray-500",
  },
};

export function ClubRequestCard({
  request,
  onViewDetails,
}: ClubRequestCardProps) {
  const statusConfig = STATUS_CONFIG[request.status];
  const StatusIcon = statusConfig.icon;
  const progress = (request.currentStep / request.totalSteps) * 100;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-lg">{request.clubName}</h3>
            <p className="text-sm text-muted-foreground">
              Mã: {request.clubCode}
            </p>
          </div>
          <Badge variant={statusConfig.variant} className="ml-2">
            <StatusIcon className={`mr-1 h-3 w-3 ${statusConfig.color}`} />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          Ngày gửi:{" "}
          {new Date(request.submittedDate).toLocaleDateString("vi-VN")}
        </div>

        {request.defenseDate && (
          <div className="flex items-center text-sm text-purple-600 font-medium">
            <Calendar className="mr-2 h-4 w-4" />
            Lịch bảo vệ:{" "}
            {new Date(request.defenseDate).toLocaleDateString("vi-VN")}
          </div>
        )}

        {request.reviewer && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Eye className="mr-2 h-4 w-4" />
            Người xét: {request.reviewer}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tiến độ</span>
            <span className="font-medium">
              {request.currentStep}/{request.totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {request.status === "rejected" && request.rejectionReason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              <strong>Lý do từ chối:</strong> {request.rejectionReason}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onViewDetails(request)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Xem chi tiết
        </Button>
      </CardFooter>
    </Card>
  );
}
