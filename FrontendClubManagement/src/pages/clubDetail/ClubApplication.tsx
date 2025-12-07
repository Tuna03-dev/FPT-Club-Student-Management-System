import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle,
  Upload,
  Calendar,
} from "lucide-react";
import {
  getRecruitmentById,
  submitApplication,
  type RecruitmentData,
  type ApplicationSubmitRequest,
} from "@/services/recruitmentService";
import { getClubDetailById, type ClubDetailData } from "@/services/clubService";
import { getMyClubs } from "@/api/clubs";
import type { VisibleTeamDTO } from "@/types/team";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClubApplicationFormProps {
  recruitmentId: number;
  onBack?: () => void;
}

export function ClubApplicationForm({
  recruitmentId,
  onBack,
}: ClubApplicationFormProps) {
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recruitment, setRecruitment] = useState<RecruitmentData | null>(null);
  const [club, setClub] = useState<ClubDetailData | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // Single file for entire form
  const [fileQuestionId, setFileQuestionId] = useState<number | null>(null); // Which question the file belongs to
  const [isAlreadyMember, setIsAlreadyMember] = useState(false); // User is already a club member
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false); // User has already applied
  const [showAlreadyAppliedDialog, setShowAlreadyAppliedDialog] =
    useState(false);
  const [alreadyAppliedMessage, setAlreadyAppliedMessage] = useState<
    string | null
  >(null);

  // Memoize teams to prevent order changes on re-render
  const teams = useMemo<VisibleTeamDTO[]>(() => {
    if (!recruitment?.teamOptions || recruitment.teamOptions.length === 0) {
      return [];
    }

    // Map teamOptions to VisibleTeamDTO format, maintaining order from API
    return recruitment.teamOptions.map((team) => ({
      teamId: team.id,
      teamName: team.teamName,
      description: team.description || "",
      memberCount: 0,
      myRoles: [],
    }));
  }, [recruitment?.teamOptions]);

  // Fetch recruitment and club data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const recruitmentData = await getRecruitmentById(recruitmentId);
        setRecruitment(recruitmentData);

        const clubData = await getClubDetailById(recruitmentData.clubId);
        setClub(clubData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Không thể tải thông tin tuyển dụng");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recruitmentId]);

  // Check if user is already a member or has already applied
  useEffect(() => {
    const checkEligibility = async () => {
      if (!recruitment) return;

      try {
        // Check if user is already a member of the club
        const myClubs = await getMyClubs();
        const isMember = myClubs.some(
          (club) => club.clubId === recruitment.clubId
        );
        setIsAlreadyMember(isMember);

        if (isMember) return; // No need to check application if already a member

        // Check if user has already applied for this recruitment
        const { checkApplicationStatus } = await import(
          "@/services/recruitmentService"
        );
        const appStatus = await checkApplicationStatus(recruitment.id);
        setHasAlreadyApplied(appStatus.hasApplied);

        if (appStatus.hasApplied) {
          setAlreadyAppliedMessage(
            "Bạn đã nộp đơn ứng tuyển cho đợt này. Không thể nộp lại."
          );
        }
      } catch (err) {
        console.error("Error checking eligibility:", err);
        // If we cannot determine, allow user to proceed (backend will validate)
      }
    };

    checkEligibility();
  }, [recruitment]);

  // Handle file selection - only one file for entire form
  const handleFileChange = (questionId: number, file: File | null) => {
    if (file) {
      setUploadedFile(file);
      setFileQuestionId(questionId);

      // Set file info in form answers
      setFormAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          fileUrl: file.name, // Store file name temporarily
        },
      }));
    } else {
      // Remove file
      setUploadedFile(null);
      setFileQuestionId(null);

      setFormAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          fileUrl: "",
        },
      }));
    }
  };

  // Format date helper
  // Accept backend LocalDateTime strings like "YYYY-MM-DDTHH:mm[:ss]" (no TZ)
  // and display as "DD/MM/YYYY HH:mm". Falls back to locale formatting.
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";

    try {
      // If string contains a 'T', treat as LocalDateTime from backend
      if (dateString.includes("T")) {
        // Keep up to minutes (YYYY-MM-DDTHH:mm)
        const trimmed = dateString.slice(0, 16);
        const [datePart, timePart] = trimmed.split("T");
        if (datePart && timePart) {
          const [year, month, day] = datePart.split("-");
          const hhmm = timePart.slice(0, 5); // HH:mm
          return `${day}/${month}/${year} ${hhmm}`;
        }
      }

      // Fallback: use Date and locale formatting
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        const dateStr = d.toLocaleDateString("vi-VN");
        const timeStr = d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${dateStr} ${timeStr}`;
      }
    } catch (e) {
      console.error("formatDate error", e);
    }

    return dateString;
  };

  const handleSubmitApplication = async () => {
    if (!recruitment) return;

    // Validate team selection if required
    if (teams.length > 0 && !selectedTeamId) {
      alert("Vui lòng chọn phòng ban bạn muốn ứng tuyển");
      return;
    }

    // Validate required questions (only check questions with isRequired = 1)
    const requiredQuestions = (recruitment.questions || []).filter(
      (q) => q.isRequired === 1
    );

    for (const q of requiredQuestions) {
      const answer = formAnswers[q.id];

      // Check if answer exists and is not empty
      if (!answer) {
        alert(`Vui lòng trả lời câu hỏi bắt buộc: ${q.questionText}`);
        return;
      }

      // For file type, check if file is uploaded
      if (q.questionType === "FILE_UPLOAD") {
        const hasFile = uploadedFile && fileQuestionId === q.id;

        if (!hasFile) {
          alert(`Vui lòng tải lên file cho câu hỏi: ${q.questionText}`);
          return;
        }
      }
      // For text type, check if answer is not empty
      else if (q.questionType === "TEXT") {
        const answerText =
          typeof answer === "string" ? answer : answer?.answerText || "";
        if (!answerText.trim()) {
          alert(`Vui lòng trả lời câu hỏi bắt buộc: ${q.questionText}`);
          return;
        }
      }
      // For MCQ and CHECKBOX, check if at least one option is selected
      else if (
        q.questionType === "MCQ" ||
        q.questionType === "MULTIPLE_CHOICE"
      ) {
        const answerText = typeof answer === "string" ? answer : "";
        if (!answerText.trim()) {
          alert(`Vui lòng chọn một đáp án cho câu hỏi: ${q.questionText}`);
          return;
        }
      } else if (q.questionType === "CHECKBOX") {
        const answers = Array.isArray(answer) ? answer : [];
        if (answers.length === 0) {
          alert(
            `Vui lòng chọn ít nhất một đáp án cho câu hỏi: ${q.questionText}`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare answers for API
      const answers: any[] = [];

      Object.entries(formAnswers).forEach(([questionId, answer]) => {
        const qId = Number(questionId);

        // Check if this question uses the uploaded file
        if (uploadedFile && fileQuestionId === qId) {
          answers.push({
            questionId: qId,
            answerText: "",
            hasFile: true, // Mark this answer as using the uploaded file
          });
        } else {
          // Handle other types (TEXT, MCQ, CHECKBOX)
          answers.push({
            questionId: qId,
            answerText: Array.isArray(answer)
              ? answer.join(", ")
              : String(answer),
            hasFile: false,
          });
        }
      });

      const request: ApplicationSubmitRequest = {
        recruitmentId: recruitment.id,
        teamId: selectedTeamId || undefined,
        answers,
      };

      await submitApplication(request, uploadedFile || undefined);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Error submitting application:", err);

      // Check if it's an axios error with response
      if (err.response?.data) {
        const errorCode = err.response.data.code;
        const errorMessage = err.response.data.message;
        // Handle specific error: already a club member
        if (errorCode === 3001) {
          alert(
            "❌ " +
              (errorMessage ||
                "Bạn đã là thành viên của câu lạc bộ này và không thể ứng tuyển lại.")
          );
          return;
        }
        // Handle specific error: already applied for this recruitment round (ví dụ code 3002)
        if (errorCode === 3002) {
          setAlreadyAppliedMessage(
            errorMessage ||
              "Bạn đã nộp đơn ứng tuyển cho đợt này. Không thể nộp lại."
          );
          setShowAlreadyAppliedDialog(true);
          return;
        }
        // Handle other specific errors
        alert(
          "❌ " + (errorMessage || "Đã có lỗi xảy ra khi gửi đơn ứng tuyển.")
        );

        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("Đã có lỗi xảy ra khi gửi đơn ứng tuyển. Vui lòng thử lại.");

        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header Skeleton */}
            <div className="flex items-center space-x-4 mb-8">
              <Skeleton className="h-10 w-24 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Club Info Card Skeleton */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start space-x-4">
                  {/* Club logo */}
                  <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-4">
                    {/* Recruitment title */}
                    <Skeleton className="h-6 w-3/4" />
                    {/* Description - 2 lines */}
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    {/* Time and max applicants info */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </div>
                    {/* Requirements section */}
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Team Selection Skeleton */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/5"
                    >
                      <Skeleton className="h-5 w-5 rounded-full mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Form Questions Skeleton */}
            <Card className="mt-6">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-2" />
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Different types of questions */}
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Skeleton className="h-5 w-3/4" />
                      {index < 2 && (
                        <Skeleton className="h-5 w-20 rounded-full" />
                      )}
                    </div>
                    {/* Text area for TEXT type */}
                    {index === 0 && (
                      <Skeleton className="h-32 w-full rounded-md" />
                    )}
                    {/* Radio options for MCQ type */}
                    {index === 1 && (
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Checkboxes for CHECKBOX type */}
                    {index === 2 && (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-4 w-28" />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* File upload for FILE type */}
                    {index === 3 && (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-6 bg-gray-50">
                          <div className="text-center space-y-3">
                            <Skeleton className="h-10 w-10 mx-auto rounded" />
                            <Skeleton className="h-4 w-32 mx-auto" />
                            <Skeleton className="h-3 w-40 mx-auto" />
                            <Skeleton className="h-10 w-32 mx-auto rounded" />
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <Skeleton className="h-px w-full" />
                          </div>
                          <div className="relative flex justify-center">
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-10 w-full rounded" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Info Box Skeleton */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </div>

                {/* Submit Buttons Skeleton */}
                <div className="flex gap-4 pt-6 border-t">
                  <Skeleton className="h-11 flex-1 rounded" />
                  <Skeleton className="h-11 w-24 rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !recruitment || !club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <p className="text-red-500 mb-4">
              {error || "Không tìm thấy thông tin tuyển dụng"}
            </p>
            <Button onClick={onBack}>Quay lại</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Gửi đơn thành công!</h2>
            <p className="text-muted-foreground mb-6">
              Đơn ứng tuyển của bạn đã được gửi đến {club.clubName}. Chúng tôi
              sẽ xem xét và liên hệ với bạn trong vòng 3-5 ngày làm việc.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Bạn có thể theo dõi trạng thái đơn ứng tuyển trong mục "Trạng
                thái đơn của tôi"
              </p>
            </div>
            <Button onClick={onBack} className="w-full mt-6">
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dialog show when user already applied for this recruitment round */}
      <Dialog
        open={showAlreadyAppliedDialog}
        onOpenChange={setShowAlreadyAppliedDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" /> Đã nộp đơn ứng tuyển
            </DialogTitle>
            <DialogDescription className="pt-4">
              <div className="space-y-3">
                <p className="text-foreground">
                  {alreadyAppliedMessage ||
                    "Bạn đã nộp đơn ứng tuyển cho đợt này. Không thể nộp lại."}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Vui lòng đợi kết quả xét tuyển hoặc liên hệ ban quản lý câu
                    lạc bộ nếu cần hỗ trợ.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAlreadyAppliedDialog(false)}
              className="w-full sm:w-auto"
            >
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">Đơn ứng tuyển</h1>
              <p className="text-muted-foreground">{club.clubName}</p>
            </div>
          </div>

          {/* Club Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <img
                  src={club.logoUrl || "/placeholder.svg"}
                  alt={club.clubName}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <CardTitle className="text-xl">{recruitment.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {recruitment.description}
                  </CardDescription>

                  {/* Recruitment Info */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    {/* Time Period */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Thời hạn: {formatDate(recruitment.endDate)}
                      </span>
                    </div>

                    {/* Max Applicants */}
                    {false && <div />}
                  </div>

                  {recruitment.requirements && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Yêu cầu:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {recruitment.requirements}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Team Selection */}
          {teams.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Chọn phòng ban</CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                  >
                    Bắt buộc
                  </Badge>
                </div>
                <CardDescription>
                  Vui lòng chọn phòng ban bạn muốn ứng tuyển
                </CardDescription>
              </CardHeader>

              <CardContent>
                <RadioGroup
                  value={selectedTeamId?.toString() || ""}
                  onValueChange={(value) => setSelectedTeamId(Number(value))}
                  className="space-y-3"
                >
                  {teams.map((team) => (
                    <div
                      key={team.teamId}
                      className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedTeamId(team.teamId)}
                    >
                      <RadioGroupItem
                        value={team.teamId.toString()}
                        id={`team-${team.teamId}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`team-${team.teamId}`}
                          className="font-medium cursor-pointer"
                        >
                          {team.teamName}
                        </Label>
                        {team.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {team.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Form Questions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Câu hỏi ứng tuyển</CardTitle>
              <CardDescription>
                Vui lòng trả lời các câu hỏi sau
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {recruitment.questions && recruitment.questions.length > 0 ? (
                recruitment.questions
                  .sort((a, b) => a.questionOrder - b.questionOrder)
                  .map((question, index) => (
                    <div key={question.id} className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Label className="text-base font-medium">
                          {index + 1}. {question.questionText}
                          {question.isRequired === 1 && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>
                        {question.isRequired === 1 && (
                          <Badge
                            variant="secondary"
                            className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-200"
                          >
                            Bắt buộc
                          </Badge>
                        )}
                      </div>

                      {question.questionType === "TEXT" && (
                        <Textarea
                          placeholder="Nhập câu trả lời của bạn..."
                          value={formAnswers[question.id] || ""}
                          onChange={(e) =>
                            setFormAnswers((prev) => ({
                              ...prev,
                              [question.id]: e.target.value,
                            }))
                          }
                          className="min-h-[120px]"
                        />
                      )}

                      {question.questionType === "MCQ" && question.options && (
                        <RadioGroup
                          value={formAnswers[question.id] || ""}
                          onValueChange={(value) =>
                            setFormAnswers((prev) => ({
                              ...prev,
                              [question.id]: value,
                            }))
                          }
                        >
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={option}
                                id={`${question.id}-${optIndex}`}
                              />
                              <Label
                                htmlFor={`${question.id}-${optIndex}`}
                                className="font-normal cursor-pointer"
                              >
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {question.questionType === "CHECKBOX" &&
                        question.options && (
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`${question.id}-${optIndex}`}
                                  checked={(
                                    formAnswers[question.id] || []
                                  ).includes(option)}
                                  onCheckedChange={(checked) => {
                                    const currentAnswers =
                                      formAnswers[question.id] || [];
                                    if (checked) {
                                      setFormAnswers((prev) => ({
                                        ...prev,
                                        [question.id]: [
                                          ...currentAnswers,
                                          option,
                                        ],
                                      }));
                                    } else {
                                      setFormAnswers((prev) => ({
                                        ...prev,
                                        [question.id]: currentAnswers.filter(
                                          (a: string) => a !== option
                                        ),
                                      }));
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`${question.id}-${optIndex}`}
                                  className="font-normal cursor-pointer"
                                >
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}

                      {question.questionType === "FILE_UPLOAD" && (
                        <div className="space-y-4">
                          {/* Warning if file already uploaded for another question */}
                          {uploadedFile && fileQuestionId !== question.id && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-amber-800">
                                Bạn đã tải file cho câu hỏi khác. Chỉ có thể tải
                                1 file cho toàn bộ đơn ứng tuyển.
                              </p>
                            </div>
                          )}

                          {/* File Upload Section */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                            <div className="text-center mb-4">
                              <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600 mb-1">
                                Tải file từ máy tính
                              </p>
                              <p className="text-xs text-amber-600 font-medium mt-1">
                                Lưu ý: Chỉ tải được 1 file cho toàn bộ đơn (tối
                                đa 20MB)
                              </p>
                            </div>

                            <div className="flex flex-col items-center gap-3">
                              <input
                                type="file"
                                id={`file-upload-${question.id}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 20 * 1024 * 1024) {
                                      alert(
                                        "File quá lớn! Vui lòng chọn file nhỏ hơn 20MB"
                                      );
                                      e.target.value = "";
                                      return;
                                    }
                                    handleFileChange(question.id, file);
                                  }
                                }}
                              />

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  document
                                    .getElementById(
                                      `file-upload-${question.id}`
                                    )
                                    ?.click();
                                }}
                                className="w-full sm:w-auto"
                                disabled={
                                  uploadedFile !== null &&
                                  fileQuestionId !== question.id
                                }
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {uploadedFile && fileQuestionId === question.id
                                  ? "Thay đổi file"
                                  : "Chọn file"}
                              </Button>

                              {uploadedFile &&
                                fileQuestionId === question.id && (
                                  <div className="w-full p-3 bg-white border rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                        <svg
                                          className="h-4 w-4 text-blue-600"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {uploadedFile.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {(uploadedFile.size / 1024).toFixed(
                                            1
                                          )}{" "}
                                          KB
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        handleFileChange(question.id, null);
                                        const input = document.getElementById(
                                          `file-upload-${question.id}`
                                        ) as HTMLInputElement;
                                        if (input) input.value = "";
                                      }}
                                      className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Không có câu hỏi nào cho đợt tuyển dụng này.
                </p>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Lưu ý:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>
                      Vui lòng trả lời các câu hỏi một cách trung thực và chi
                      tiết
                    </li>
                    <li>
                      Đơn ứng tuyển sẽ được xem xét trong vòng 3-5 ngày làm việc
                    </li>
                    {/* <li>Bạn sẽ nhận được thông báo qua email về kết quả</li> */}
                  </ul>
                </div>
              </div>

              {/* Warning messages if user cannot apply */}
              {isAlreadyMember && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Không thể ứng tuyển</p>
                    <p>
                      Bạn đã là thành viên của câu lạc bộ này và không thể ứng
                      tuyển lại.
                    </p>
                  </div>
                </div>
              )}

              {!isAlreadyMember && hasAlreadyApplied && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Đã nộp đơn ứng tuyển</p>
                    <p>
                      Bạn đã nộp đơn ứng tuyển cho đợt này. Vui lòng đợi kết quả
                      xét duyệt.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <Button
                  onClick={handleSubmitApplication}
                  disabled={
                    isSubmitting || isAlreadyMember || hasAlreadyApplied
                  }
                  className="flex-1"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Đang gửi..." : "Gửi đơn ứng tuyển"}
                </Button>
                {onBack && (
                  <Button variant="outline" onClick={onBack} size="lg">
                    Hủy
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
