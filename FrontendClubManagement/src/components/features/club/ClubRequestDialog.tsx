import { useMemo, useState } from "react";
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
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClubRequest } from "./ClubRequestCard";
import type { ClubCreationStepResponse, WorkflowHistoryResponse } from "@/api/clubCreation";

interface ClubRequestDialogProps {
  request: ClubRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowSteps?: ClubCreationStepResponse[];
  workflowHistory?: WorkflowHistoryResponse[];
  // Request detail data
  requestDetail?: import("@/api/clubCreation").RequestEstablishmentResponse | null;
  proposals?: import("@/api/clubCreation").ClubProposalResponse[];
  defenseSchedule?: import("@/api/clubCreation").DefenseScheduleResponse | null;
  finalForms?: import("@/api/clubCreation").ClubCreationFinalFormResponse[];
}

interface WorkflowStep {
  id: number;
  label: string;
  description: string;
  icon: React.ElementType;
  orderIndex: number;
  code?: string; // Optional: để map với history
}

// Map step code to icon
const getIconForStepCode = (code: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    REQUEST_SUBMITTED: FileText,
    REQUEST_REVIEW: Clock,
    PROPOSAL_REQUIRED: FileText, // Yêu cầu nộp đề án
    PROPOSAL_SUBMITTED: FileText,
    PROPOSAL_REVIEW: FileText,
    PROPOSE_DEFENSE_TIME: Calendar,
    DEFENSE_SCHEDULE_CONFIRMED: Calendar,
    DEFENSE_COMPLETED: Users,
    FINAL_FORM: FileText,
    FINAL_FORM_APPROVED: CheckCircle2,
    CLUB_CREATED: CheckCircle2,
  };
  return iconMap[code] || FileText;
};

// Convert API steps to WorkflowStep format
const convertToWorkflowSteps = (
  steps: ClubCreationStepResponse[]
): (WorkflowStep & { code: string })[] => {
  return steps.map((step) => ({
    id: step.id,
    label: step.name,
    description: step.description || "",
    icon: getIconForStepCode(step.code),
    orderIndex: step.orderIndex,
    code: step.code, // Giữ lại code để map với history
  }));
};

export function ClubRequestDialog({
  request,
  open,
  onOpenChange,
  workflowSteps = [],
  workflowHistory = [],
  requestDetail,
  proposals = [],
  defenseSchedule,
  finalForms = [],
}: ClubRequestDialogProps) {
  if (!request) return null;

  const progress = (request.currentStep / request.totalSteps) * 100;

  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const completedStepCodes = useMemo(() => {
    return new Set(
      (workflowHistory || [])
        .map((h) => h.stepCode)
        .filter((code): code is string => Boolean(code))
    );
  }, [workflowHistory]);

  const historyByStepCode = useMemo(() => {
    const map: Record<string, WorkflowHistoryResponse[]> = {};
    (workflowHistory || []).forEach((history) => {
      if (!history.stepCode) return;
      if (!map[history.stepCode]) {
        map[history.stepCode] = [];
      }
      map[history.stepCode].push(history);
    });
    return map;
  }, [workflowHistory]);

  const timelineSteps = useMemo(() => {
    if (!workflowSteps || workflowSteps.length === 0) return [];
    return convertToWorkflowSteps(workflowSteps).sort(
      (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
    );
  }, [workflowSteps]);
  
  const parseFinalFormData = (formData?: string): { title?: string; fileUrl?: string } => {
    if (!formData) return {};
    try {
      return JSON.parse(formData);
    } catch {
      return {};
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{request.clubName}</DialogTitle>
          <DialogDescription>
            Mã CLB: {request.clubCode} • Ngày gửi:{" "}
            {new Date(request.submittedDate).toLocaleDateString("vi-VN")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview - Clickable to toggle workflow timeline */}
          <div 
            className="space-y-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
            onClick={() => setIsTimelineExpanded((prev) => !prev)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tiến độ xử lý</h3>
              <Badge variant="outline">
                Bước {request.currentStep}/{request.totalSteps}
              </Badge>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {isTimelineExpanded ? "Nhấn để thu gọn" : "Nhấn để xem chi tiết quy trình"}
            </p>
          </div>

          {isTimelineExpanded && (
            <div className="space-y-4 rounded-lg border border-orange-100 bg-orange-50/40 p-4">
              {timelineSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có dữ liệu quy trình để hiển thị.
                </p>
              ) : (
                timelineSteps.map((step, index) => {
                  const hasHistory = step.code ? completedStepCodes.has(step.code) : false;
                  const isCompleted = hasHistory || step.orderIndex < request.currentStep;
                  const isCurrent = step.orderIndex === request.currentStep;
                  const StepIcon = step.icon;
                  const stepHistories = step.code
                    ? historyByStepCode[step.code] || []
                    : [];

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
                        {index < timelineSteps.length - 1 && (
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
                        {stepHistories.length > 0 && (
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {stepHistories.map((history) => (
                              <p key={history.id}>
                                <span className="font-medium">
                                  {history.actionDate
                                    ? new Date(history.actionDate).toLocaleString("vi-VN")
                                    : ""}
                                </span>
                                {history.comments && (
                                  <>
                                    {" — "}
                                    {history.comments}
                                  </>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <Separator />

          {/* Club Information */}
          {requestDetail && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Thông tin câu lạc bộ</h3>
                <div className="space-y-2">
                  {requestDetail.clubCategory && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Lĩnh vực
                      </p>
                      <p className="text-sm">{requestDetail.clubCategory}</p>
                    </div>
                  )}
                  {requestDetail.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Mô tả
                      </p>
                      <p className="text-sm">{requestDetail.description}</p>
                    </div>
                  )}
                  {requestDetail.expectedMemberCount && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Đối tượng hướng tới
                      </p>
                      <p className="text-sm">{requestDetail.expectedMemberCount} thành viên</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Proposals Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Đề án đã nộp</h3>
              {proposals.length > 0 && (
                <Badge variant="outline">{proposals.length} đề án</Badge>
              )}
            </div>
            {proposals.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">
                Chưa có đề án nào được nộp
              </div>
            ) : (
              <div className="space-y-2">
                {proposals.map((proposal, index) => (
                  <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{proposal.title}</p>
                            {index === 0 && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                Mới nhất
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Ngày nộp:{" "}
                            {new Date(proposal.createdAt).toLocaleDateString("vi-VN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {proposal.fileUrl && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(proposal.fileUrl, "_blank");
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Xem
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = proposal.fileUrl;
                                link.download = proposal.title || "proposal";
                                link.target = "_blank";
                                link.click();
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Tải
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {proposals.length > 0 && <Separator />}

          {/* Defense Schedule Section */}
          {defenseSchedule && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Lịch bảo vệ</h3>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Ngày và giờ bảo vệ
                      </p>
                      <p className="text-sm">
                        {new Date(defenseSchedule.defenseDate).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {defenseSchedule.location && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Địa điểm
                        </p>
                        <p className="text-sm">{defenseSchedule.location}</p>
                      </div>
                    )}
                    {defenseSchedule.meetingLink && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Link meeting
                        </p>
                        <a
                          href={defenseSchedule.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {defenseSchedule.meetingLink}
                        </a>
                      </div>
                    )}
                    {defenseSchedule.notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Ghi chú
                        </p>
                        <p className="text-sm">{defenseSchedule.notes}</p>
                      </div>
                    )}
                    {defenseSchedule.result && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Kết quả
                        </p>
                        <Badge
                          className={
                            defenseSchedule.result === "PASSED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {defenseSchedule.result === "PASSED" ? "Đạt" : "Không đạt"}
                        </Badge>
                      </div>
                    )}
                    {defenseSchedule.feedback && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Feedback
                        </p>
                        <p className="text-sm">{defenseSchedule.feedback}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Separator />
            </>
          )}

          {/* Final Forms Section */}
          {finalForms.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Form cuối đã nộp</h3>
                  <Badge variant="outline">{finalForms.length} form</Badge>
                </div>
                <div className="space-y-2">
                  {finalForms.map((form, index) => {
                    const formData = parseFinalFormData(form.formData);
                    return (
                      <Card key={form.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{formData.title || "Form cuối"}</p>
                                {index === 0 && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Mới nhất
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Ngày nộp:{" "}
                                {form.submittedAt
                                  ? new Date(form.submittedAt).toLocaleDateString("vi-VN", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Trạng thái: {form.status || "SUBMITTED"}
                              </p>
                            </div>
                            {formData.fileUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = formData.fileUrl!;
                                  link.download = formData.title || "final-form";
                                  link.target = "_blank";
                                  link.click();
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Tải
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Contact Information */}
          {requestDetail && (
            <div className="space-y-3">
              <h3 className="font-semibold">Thông tin liên hệ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requestDetail.assignedStaffFullName && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Người xét duyệt
                      </p>
                      <p className="text-sm text-blue-700">{requestDetail.assignedStaffFullName}</p>
                    </div>
                  </div>
                )}
                {requestDetail.email && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-700">{requestDetail.email}</p>
                    </div>
                  </div>
                )}
                {requestDetail.phone && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Số điện thoại
                      </p>
                      <p className="text-sm text-gray-700">{requestDetail.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
