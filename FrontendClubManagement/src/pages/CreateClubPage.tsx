import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ClubRequestForm,
  type ClubRequestFormData,
} from "@/components/features/club/ClubRequestForm";
import {
  ClubRequestCard,
  type ClubRequest,
} from "@/components/features/club/ClubRequestCard";
import { ClubRequestDialog } from "@/components/features/club/ClubRequestDialog";
import {
  clubCreationApi,
  type RequestEstablishmentResponse,
  type ClubCreationFinalFormResponse,
} from "@/api/clubCreation";
import { Button } from "@/components/ui/button";
import { Card} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, Send, Trash2, Edit, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper function to map BE status to FE status
const mapStatusToFE = (status: string): ClubRequest["status"] => {
  const statusMap: Record<string, ClubRequest["status"]> = {
    DRAFT: "draft",
    SUBMITTED: "pending_review",
    CONTACT_CONFIRMATION_PENDING: "under_review",
    CONTACT_CONFIRMED: "under_review",
    CONTACT_REJECTED: "rejected",
    PROPOSAL_REQUIRED: "pending_documents",
    PROPOSAL_SUBMITTED: "documents_submitted",
    PROPOSAL_REJECTED: "revision_required",
    PROPOSAL_APPROVED: "documents_submitted",
    DEFENSE_SCHEDULE_PROPOSED: "defense_scheduled",
    DEFENSE_SCHEDULE_APPROVED: "defense_scheduled",
    DEFENSE_SCHEDULE_REJECTED: "revision_required",
    DEFENSE_SCHEDULED: "defense_scheduled",
    DEFENSE_COMPLETED: "defense_completed",
    FEEDBACK_PROVIDED: "defense_completed",
    FINAL_FORM_SUBMITTED: "defense_completed",
    FINAL_FORM_REVIEWED: "defense_completed",
    APPROVED: "approved",
    REJECTED: "rejected",
  };
  return statusMap[status] || "pending_review";
};

// Helper function to calculate current step from status
const getCurrentStep = (status: string): number => {
  const stepMap: Record<string, number> = {
    DRAFT: 1,
    SUBMITTED: 2,
    CONTACT_CONFIRMATION_PENDING: 2,
    CONTACT_CONFIRMED: 3,
    CONTACT_REJECTED: 1,
    PROPOSAL_REQUIRED: 3,
    PROPOSAL_SUBMITTED: 4,
    PROPOSAL_REJECTED: 3,
    PROPOSAL_APPROVED: 5,
    DEFENSE_SCHEDULE_PROPOSED: 6,
    DEFENSE_SCHEDULE_APPROVED: 6,
    DEFENSE_SCHEDULE_REJECTED: 5,
    DEFENSE_SCHEDULED: 7,
    DEFENSE_COMPLETED: 7,
    FEEDBACK_PROVIDED: 8,
    FINAL_FORM_SUBMITTED: 8,
    FINAL_FORM_REVIEWED: 8,
    APPROVED: 8,
    REJECTED: 1,
  };
  return stepMap[status] || 1;
};

// Convert BE response to FE ClubRequest
const convertToClubRequest = (
  response: RequestEstablishmentResponse
): ClubRequest => {
  return {
    id: response.id.toString(),
    clubName: response.clubName,
    clubCode: response.clubCode,
    submittedDate: response.sendDate || response.createdAt,
    status: mapStatusToFE(response.status),
    currentStep: getCurrentStep(response.status),
    totalSteps: 8,
    reviewer: response.assignedStaffFullName,
  };
};

const CreateClubPage = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [clubRequests, setClubRequests] = useState<ClubRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ClubRequest | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isDefenseScheduleDialogOpen, setIsDefenseScheduleDialogOpen] = useState(false);
  const [isFinalFormDialogOpen, setIsFinalFormDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestEstablishmentResponse | null>(null);

  // Proposal form state
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [proposalFileUrl, setProposalFileUrl] = useState("");

  // Defense schedule form state
  const [defenseDate, setDefenseDate] = useState("");
  const [defenseTime, setDefenseTime] = useState("");
  const [defenseLocation, setDefenseLocation] = useState("");
  const [defenseMeetingLink, setDefenseMeetingLink] = useState("");
  const [defenseNotes, setDefenseNotes] = useState("");

  // Final form state
  const [finalFormTitle, setFinalFormTitle] = useState("");
  const [finalFormFile, setFinalFormFile] = useState<File | null>(null);
  const [finalFormFileUrl, setFinalFormFileUrl] = useState("");
  const [finalFormHistory, setFinalFormHistory] = useState<ClubCreationFinalFormResponse[]>([]);
  const [isFinalFormHistoryLoading, setIsFinalFormHistoryLoading] = useState(false);
  const loadFinalForms = async (requestId: number) => {
    try {
      setIsFinalFormHistoryLoading(true);
      const responses = await clubCreationApi.getFinalForms(requestId);
      setFinalFormHistory(responses);
    } catch (error: any) {
      toast.error("Không thể tải danh sách form cuối", {
        description: error.message || "Đã xảy ra lỗi",
      });
      setFinalFormHistory([]);
    } finally {
      setIsFinalFormHistoryLoading(false);
    }
  };

  const parseFinalFormData = (formData?: string): { title?: string; fileUrl?: string } => {
    if (!formData) return {};
    try {
      return JSON.parse(formData);
    } catch {
      return {};
    }
  };

  useEffect(() => {
    if (isFinalFormDialogOpen && selectedRequest) {
      loadFinalForms(parseInt(selectedRequest.id));
    } else if (!isFinalFormDialogOpen) {
      setFinalFormHistory([]);
    }
  }, [isFinalFormDialogOpen, selectedRequest]);

  // Load requests
  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await clubCreationApi.getMyRequests(0, 100);
      if (Array.isArray(requests)) {
        setClubRequests(requests.map(convertToClubRequest));
      } else {
        console.error("Invalid response format:", requests);
        toast.error("Dữ liệu trả về không đúng định dạng");
      }
    } catch (error: any) {
      toast.error("Không thể tải danh sách yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Handle form submission (create request)
  const handleFormSubmit = async (formData: ClubRequestFormData) => {
    try {
      setIsLoading(true);
      const response = await clubCreationApi.createRequest({
        clubName: formData.clubName,
        clubCode: formData.clubCode,
        clubCategory: formData.category,
        description: formData.description,
        expectedMemberCount: formData.expectedMemberCount,
        email: formData.email,
        phone: formData.phone,
        facebookLink: formData.facebookLink || undefined,
        instagramLink: formData.instagramLink || undefined,
        tiktokLink: formData.tiktokLink || undefined,
      });
      toast.success("Đã tạo yêu cầu thành công!", {
        description: "Bạn có thể chỉnh sửa hoặc gửi yêu cầu khi đã sẵn sàng.",
      });
      await loadRequests();
      setActiveTab("pending");
    } catch (error: any) {
      toast.error("Không thể tạo yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  //
  // Handle submit request (DRAFT -> SUBMITTED)
  const handleSubmitRequest = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationApi.submitRequest(requestId);
      toast.success("Đã gửi yêu cầu thành công!", {
        description: "Yêu cầu của bạn đang được xem xét.",
      });
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể gửi yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete request
  const handleDeleteRequest = async (requestId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu này?")) return;

    try {
      setIsLoading(true);
      await clubCreationApi.deleteRequest(requestId);
      toast.success("Đã xóa yêu cầu thành công!");
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể xóa yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit request
  const handleEditRequest = async (requestId: number) => {
    try {
      setIsLoading(true);
      const response = await clubCreationApi.getRequestDetail(requestId);
      setEditingRequest(response);
    } catch (error: any) {
      toast.error("Không thể tải thông tin yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update request
  const handleUpdateRequest = async () => {
    if (!editingRequest) return;

    try {
      setIsLoading(true);
      await clubCreationApi.updateRequest(editingRequest.id, {
        clubName: editingRequest.clubName,
        clubCode: editingRequest.clubCode,
        clubCategory: editingRequest.clubCategory,
        description: editingRequest.description,
        expectedMemberCount: editingRequest.expectedMemberCount,
        email: editingRequest.email,
        phone: editingRequest.phone,
        facebookLink: editingRequest.facebookLink,
        instagramLink: editingRequest.instagramLink,
        tiktokLink: editingRequest.tiktokLink,
      });
      toast.success("Đã cập nhật yêu cầu thành công!");
      setEditingRequest(null);
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể cập nhật yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle defense schedule submission
  const handleDefenseScheduleSubmit = async () => {
    if (!selectedRequest) return;
    
    if (!defenseDate) {
      toast.error("Vui lòng chọn ngày bảo vệ!");
      return;
    }
    
    if (!defenseLocation.trim()) {
      toast.error("Vui lòng nhập địa điểm bảo vệ!");
      return;
    }

    // Combine date and time
    const defenseDateTime = defenseTime 
      ? `${defenseDate}T${defenseTime}:00`
      : `${defenseDate}T09:00:00`; // Default to 9 AM if no time provided

    try {
      setIsLoading(true);
      await clubCreationApi.proposeDefenseSchedule(parseInt(selectedRequest.id), {
        defenseDate: defenseDateTime,
        location: defenseLocation.trim(),
        meetingLink: defenseMeetingLink.trim() || undefined,
        notes: defenseNotes.trim() || undefined,
      });
      toast.success(
        selectedRequest.status === "revision_required" && selectedRequest.currentStep === 5
          ? "Đã gửi lại đề xuất lịch bảo vệ thành công!"
          : "Đã gửi đề xuất lịch bảo vệ thành công!"
      );
      setIsDefenseScheduleDialogOpen(false);
      // Reset form
      setDefenseDate("");
      setDefenseTime("");
      setDefenseLocation("");
      setDefenseMeetingLink("");
      setDefenseNotes("");
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể gửi đề xuất lịch bảo vệ", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submit proposal
  const handleSubmitProposal = async () => {
    if (!selectedRequest) return;
    if (!proposalTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề đề án!");
      return;
    }
    if (!proposalFile && !proposalFileUrl) {
      toast.error("Vui lòng upload file đề án hoặc nhập fileUrl!");
      return;
    }

    try {
      setIsLoading(true);
      await clubCreationApi.submitProposal(
        parseInt(selectedRequest.id),
        {
          title: proposalTitle,
          fileUrl: proposalFileUrl || undefined,
        },
        proposalFile || undefined
      );
      toast.success(
        selectedRequest.status === "revision_required"
          ? "Đã nộp lại đề án thành công!"
          : "Đã nộp đề án thành công!"
      );
      setIsProposalDialogOpen(false);
      setProposalTitle("");
      setProposalFile(null);
      setProposalFileUrl("");
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể nộp đề án", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submit final form
  const handleSubmitFinalForm = async () => {
    if (!selectedRequest) return;
    if (!finalFormTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề form!");
      return;
    }
    if (!finalFormFile && !finalFormFileUrl) {
      toast.error("Vui lòng upload file form cuối hoặc nhập fileUrl!");
      return;
    }

    try {
      setIsLoading(true);
      await clubCreationApi.submitFinalForm(
        parseInt(selectedRequest.id),
        {
          title: finalFormTitle,
          fileUrl: finalFormFileUrl || undefined,
        },
        finalFormFile || undefined
      );
      toast.success("Đã nộp form cuối thành công!");
      setIsFinalFormDialogOpen(false);
      setFinalFormTitle("");
      setFinalFormFile(null);
      setFinalFormFileUrl("");
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể nộp form cuối", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = (request: ClubRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  // Filter requests by status
  const pendingRequests = clubRequests.filter(
    (r) =>
      r.status === "draft" ||
      r.status === "pending_review" ||
      r.status === "under_review" ||
      r.status === "pending_documents" ||
      r.status === "documents_submitted" ||
      r.status === "defense_scheduled" ||
      r.status === "defense_completed" ||
      r.status === "revision_required"
  );

  const completedRequests = clubRequests.filter((r) => r.status === "approved");
  const rejectedRequests = clubRequests.filter((r) => r.status === "rejected");

  // Get request detail for actions
  const getRequestDetail = async (requestId: number) => {
    try {
      return await clubCreationApi.getRequestDetail(requestId);
    } catch (error: any) {
      toast.error("Không thể tải thông tin yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
      return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đăng ký thành lập CLB</h1>
        <p className="text-muted-foreground">
          Tạo câu lạc bộ mới và theo dõi quá trình xét duyệt
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Tạo mới</TabsTrigger>
          <TabsTrigger value="pending">
            Đang xử lý
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Đã hoàn thành
            {completedRequests.length > 0 && (
              <span className="ml-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
                {completedRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Bị từ chối
            {rejectedRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                {rejectedRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Create new request tab */}
        <TabsContent value="create" className="space-y-6">
          <ClubRequestForm onSubmit={handleFormSubmit} />
        </TabsContent>

        {/* Pending requests tab */}
        <TabsContent value="pending" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Đang tải...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có đơn đăng ký nào đang xử lý</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRequests.map((request) => {
                  const requestDetail = async () => {
                    const detail = await getRequestDetail(parseInt(request.id));
                    return detail;
                  };

                  return (
                    <Card key={request.id} className="hover:shadow-lg transition-shadow">
                      <div className="p-4 space-y-4">
                        <ClubRequestCard
                          request={request}
                          onViewDetails={handleViewDetails}
                        />
                        <div className="flex gap-2">
                          {request.status === "draft" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  const detail = await getRequestDetail(parseInt(request.id));
                                  if (detail) {
                                    setEditingRequest(detail);
                                  }
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Sửa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleDeleteRequest(parseInt(request.id))}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleSubmitRequest(parseInt(request.id))}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Gửi
                              </Button>
                            </>
                          )}
                          {request.status === "pending_documents" && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsProposalDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Nộp đề án
                            </Button>
                          )}
                          {request.status === "revision_required" && request.currentStep === 3 && (
                            <Button
                              size="sm"
                              className="flex-1"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsProposalDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Nộp lại đề án
                            </Button>
                          )}
                          {(request.status === "documents_submitted" && request.currentStep === 5) ||
                          (request.status === "revision_required" && request.currentStep === 5) ? (
                            <Button
                              size="sm"
                              className="flex-1"
                              variant={request.status === "revision_required" ? "outline" : "default"}
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsDefenseScheduleDialogOpen(true);
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {request.status === "revision_required" 
                                ? "Đề xuất lại lịch bảo vệ"
                                : "Đề xuất lịch bảo vệ"}
                            </Button>
                          ) : null}
                          {request.status === "defense_completed" && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsFinalFormDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Nộp form cuối
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Completed requests tab */}
        <TabsContent value="completed" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Đang tải...</p>
            </div>
          ) : completedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có CLB nào được phê duyệt</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedRequests.map((request) => (
                <ClubRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected requests tab */}
        <TabsContent value="rejected" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Đang tải...</p>
            </div>
          ) : rejectedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có đơn nào bị từ chối</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedRequests.map((request) => (
                <ClubRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request detail dialog */}
      <ClubRequestDialog
        request={selectedRequest}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {/* Edit request dialog */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingRequest && (
            <>
              <DialogHeader>
                <DialogTitle>Chỉnh sửa yêu cầu</DialogTitle>
                <DialogDescription>
                  Cập nhật thông tin yêu cầu thành lập CLB
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clubName">Tên CLB *</Label>
                  <Input
                    id="clubName"
                    value={editingRequest.clubName}
                    onChange={(e) =>
                      setEditingRequest({ ...editingRequest, clubName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clubCode">Mã CLB *</Label>
                  <Input
                    id="clubCode"
                    value={editingRequest.clubCode}
                    onChange={(e) =>
                      setEditingRequest({ ...editingRequest, clubCode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả *</Label>
                  <Textarea
                    id="description"
                    value={editingRequest.description}
                    onChange={(e) =>
                      setEditingRequest({ ...editingRequest, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingRequest(null)}>
                  Hủy
                </Button>
                <Button onClick={handleUpdateRequest}>Lưu</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit proposal dialog */}
      <Dialog
        open={isProposalDialogOpen}
        onOpenChange={(open) => {
          setIsProposalDialogOpen(open);
          if (!open) {
            // Reset form when closing dialog
            setProposalTitle("");
            setProposalFile(null);
            setProposalFileUrl("");
            setSelectedRequest(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === "revision_required"
                ? "Nộp lại đề án chi tiết"
                : "Nộp đề án chi tiết"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "revision_required"
                ? "Vui lòng chỉnh sửa và nộp lại đề án theo yêu cầu của staff"
                : "Upload file đề án (Word, Excel, PDF, PowerPoint)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proposalTitle">Tiêu đề đề án *</Label>
              <Input
                id="proposalTitle"
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                placeholder="VD: Đề án thành lập CLB Lập trình FPT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalFile">File đề án *</Label>
              <Input
                id="proposalFile"
                type="file"
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx"
                onChange={(e) => setProposalFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalFileUrl">Hoặc File URL</Label>
              <Input
                id="proposalFileUrl"
                value={proposalFileUrl}
                onChange={(e) => setProposalFileUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProposalDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitProposal}>
              <Upload className="mr-2 h-4 w-4" />
              {selectedRequest?.status === "revision_required"
                ? "Nộp lại đề án"
                : "Nộp đề án"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Defense schedule dialog */}
      <Dialog
        open={isDefenseScheduleDialogOpen}
        onOpenChange={(open) => {
          setIsDefenseScheduleDialogOpen(open);
          if (!open) {
            // Reset form when closing dialog
            setDefenseDate("");
            setDefenseTime("");
            setDefenseLocation("");
            setDefenseMeetingLink("");
            setDefenseNotes("");
            setSelectedRequest(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === "revision_required"
                ? "Đề xuất lại lịch bảo vệ"
                : "Đề xuất lịch bảo vệ"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "revision_required"
                ? "Vui lòng chỉnh sửa và đề xuất lại lịch bảo vệ theo yêu cầu của staff"
                : "Vui lòng chọn ngày, thời gian và địa điểm để bảo vệ đề án thành lập CLB"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defenseDate">Ngày bảo vệ *</Label>
                <Input
                  id="defenseDate"
                  type="date"
                  value={defenseDate}
                  onChange={(e) => setDefenseDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} // Tomorrow
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defenseTime">Thời gian</Label>
                <Input
                  id="defenseTime"
                  type="time"
                  value={defenseTime}
                  onChange={(e) => setDefenseTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defenseLocation">Địa điểm bảo vệ *</Label>
              <Input
                id="defenseLocation"
                value={defenseLocation}
                onChange={(e) => setDefenseLocation(e.target.value)}
                placeholder="VD: Phòng A101, Tòa nhà Alpha"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defenseMeetingLink">Link meeting (nếu có)</Label>
              <Input
                id="defenseMeetingLink"
                value={defenseMeetingLink}
                onChange={(e) => setDefenseMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defenseNotes">Ghi chú</Label>
              <Textarea
                id="defenseNotes"
                value={defenseNotes}
                onChange={(e) => setDefenseNotes(e.target.value)}
                placeholder="Thời gian cụ thể, yêu cầu đặc biệt..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDefenseScheduleDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleDefenseScheduleSubmit}>
              <Send className="mr-2 h-4 w-4" />
              {selectedRequest?.status === "revision_required"
                ? "Gửi lại đề xuất"
                : "Gửi đề xuất"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit final form dialog */}
      <Dialog open={isFinalFormDialogOpen} onOpenChange={setIsFinalFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nộp form cuối</DialogTitle>
            <DialogDescription>
              Upload file form cuối (Word, Excel, PDF, PowerPoint)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finalFormTitle">Tiêu đề form *</Label>
              <Input
                id="finalFormTitle"
                value={finalFormTitle}
                onChange={(e) => setFinalFormTitle(e.target.value)}
                placeholder="VD: Form cuối thành lập CLB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalFormFile">File form cuối *</Label>
              <Input
                id="finalFormFile"
                type="file"
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx"
                onChange={(e) => setFinalFormFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalFormFileUrl">Hoặc File URL</Label>
              <Input
                id="finalFormFileUrl"
                value={finalFormFileUrl}
                onChange={(e) => setFinalFormFileUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Lịch sử form đã nộp</Label>
              {isFinalFormHistoryLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : finalFormHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có form nào được nộp.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {finalFormHistory.map((form) => {
                    const data = parseFinalFormData(form.formData);
                    return (
                      <div
                        key={form.id}
                        className="rounded-md border p-3 text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{data.title || "Không rõ tiêu đề"}</p>
                          <span className="text-xs text-muted-foreground">
                            {form.submittedAt
                              ? new Date(form.submittedAt).toLocaleString("vi-VN")
                              : ""}
                          </span>
                        </div>
                        {data.fileUrl && (
                          <a
                            href={data.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs underline"
                          >
                            Xem file
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Trạng thái: {form.status || "SUBMITTED"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalFormDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitFinalForm}>
              <Upload className="mr-2 h-4 w-4" />
              Nộp form cuối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateClubPage;
