import { useState } from "react";
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
  DefenseScheduleForm,
  type DefenseScheduleData,
} from "@/components/features/club/DefenseScheduleForm";

// Mock data
const MOCK_REQUESTS: ClubRequest[] = [
  {
    id: "1",
    clubName: "CLB Lập trình FPT",
    clubCode: "FPTU_CODING",
    submittedDate: "2024-11-01",
    status: "defense_scheduled",
    currentStep: 6,
    totalSteps: 8,
    defenseDate: "2024-11-20",
    reviewer: "TS. Nguyễn Văn A",
  },
  {
    id: "2",
    clubName: "CLB Blockchain",
    clubCode: "FPTU_BLOCKCHAIN",
    submittedDate: "2024-11-05",
    status: "under_review",
    currentStep: 2,
    totalSteps: 8,
    reviewer: "ThS. Trần Thị B",
  },
  {
    id: "3",
    clubName: "CLB Game Development",
    clubCode: "FPTU_GAMEDEV",
    submittedDate: "2024-10-28",
    status: "rejected",
    currentStep: 2,
    totalSteps: 8,
    rejectionReason:
      "Đã có CLB tương tự hoạt động. Đề xuất tham gia CLB hiện có.",
  },
];

const CreateClubPage = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [clubRequests, setClubRequests] =
    useState<ClubRequest[]>(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<ClubRequest | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Handle form submission
  const handleFormSubmit = (formData: ClubRequestFormData) => {
    const newRequest: ClubRequest = {
      id: Date.now().toString(),
      clubName: formData.clubName,
      clubCode: formData.clubCode,
      submittedDate: new Date().toISOString().split("T")[0],
      status: "pending_review",
      currentStep: 1,
      totalSteps: 8,
    };

    setClubRequests([newRequest, ...clubRequests]);
    toast.success("Đã gửi đơn đăng ký thành công!", {
      description:
        "Yêu cầu của bạn đang được xem xét. Chúng tôi sẽ phản hồi trong 3-5 ngày.",
    });
    setActiveTab("pending");
  };

  // Handle defense schedule submission
  const handleDefenseScheduleSubmit = (data: DefenseScheduleData) => {
    const updatedRequests = clubRequests.map((request) =>
      request.id === data.requestId
        ? {
            ...request,
            status: "defense_scheduled" as const,
            currentStep: 6,
            defenseDate: data.preferredDate1, // Mock: use first preferred date
          }
        : request
    );
    setClubRequests(updatedRequests);
  };

  // Handle view details
  const handleViewDetails = (request: ClubRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  // Filter requests by status
  const pendingRequests = clubRequests.filter(
    (r) =>
      r.status === "pending_review" ||
      r.status === "under_review" ||
      r.status === "pending_documents" ||
      r.status === "documents_submitted" ||
      r.status === "defense_scheduled" ||
      r.status === "defense_completed"
  );

  const completedRequests = clubRequests.filter((r) => r.status === "approved");
  const rejectedRequests = clubRequests.filter((r) => r.status === "rejected");

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
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có đơn đăng ký nào đang xử lý</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRequests.map((request) => (
                  <ClubRequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>

              {/* Show defense schedule form for requests at step 6 */}
              {pendingRequests.some((r) => r.currentStep === 5) && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">
                    Đề xuất lịch bảo vệ
                  </h2>
                  {pendingRequests
                    .filter((r) => r.currentStep === 5)
                    .map((request) => (
                      <DefenseScheduleForm
                        key={request.id}
                        requestId={request.id}
                        onSubmit={handleDefenseScheduleSubmit}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Completed requests tab */}
        <TabsContent value="completed" className="space-y-6">
          {completedRequests.length === 0 ? (
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
          {rejectedRequests.length === 0 ? (
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
    </div>
  );
};

export default CreateClubPage;
