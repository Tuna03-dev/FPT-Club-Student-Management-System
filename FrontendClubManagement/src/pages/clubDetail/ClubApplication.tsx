"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
  Upload,
} from "lucide-react";
import {
  getRecruitmentById,
  submitApplication,
  type RecruitmentData,
  type ApplicationSubmitRequest,
} from "@/service/RecruitmentService";
import { getClubDetailById, type ClubDetailData } from "@/service/ClubService";
import { getVisibleTeams } from "@/api/teams";
import type { VisibleTeamDTO } from "@/types/team";

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
  const [teams, setTeams] = useState<VisibleTeamDTO[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, File>>({});

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

        // Fetch teams if teamOptionIds is provided
        if (
          recruitmentData.teamOptionIds &&
          recruitmentData.teamOptionIds.length > 0
        ) {
          setLoadingTeams(true);
          try {
            const allTeams = await getVisibleTeams(recruitmentData.clubId);
            // Filter teams based on teamOptionIds
            const availableTeams = allTeams.filter((team) =>
              recruitmentData.teamOptionIds?.includes(team.teamId)
            );
            setTeams(availableTeams);
          } catch (teamErr) {
            console.error("Error fetching teams:", teamErr);
          } finally {
            setLoadingTeams(false);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Không thể tải thông tin tuyển dụng");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recruitmentId]);

  // Handle file selection
  const handleFileChange = (questionId: number, file: File | null) => {
    if (file) {
      setUploadedFiles((prev) => ({
        ...prev,
        [questionId]: file,
      }));

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
      const newFiles = { ...uploadedFiles };
      delete newFiles[questionId];
      setUploadedFiles(newFiles);

      setFormAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          fileUrl: "",
        },
      }));
    }
  };

  const handleSubmitApplication = async () => {
    if (!recruitment) return;

    // Validate team selection if required
    if (teams.length > 0 && !selectedTeamId) {
      alert("Vui lòng chọn phòng ban bạn muốn ứng tuyển");
      return;
    }

    // Validate required questions
    const requiredQuestions = recruitment.questions || [];

    const allAnswered = requiredQuestions.every((q) => {
      const answer = formAnswers[q.id];
      if (!answer) return false;

      // For file type, check if fileUrl is provided
      if (q.questionType === "FILE") {
        return answer.fileUrl || answer.answerText;
      }

      return true;
    });

    if (!allAnswered) {
      alert("Vui lòng trả lời đầy đủ tất cả các câu hỏi");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare answers for API and collect files
      const answers: any[] = [];
      const filesByQuestionId = new Map<number, File>();

      Object.entries(formAnswers).forEach(([questionId, answer]) => {
        const qId = Number(questionId);
        
        // Check if this question has an uploaded file
        if (uploadedFiles[qId]) {
          filesByQuestionId.set(qId, uploadedFiles[qId]);
          answers.push({
            questionId: qId,
            answerText: typeof answer === "object" ? answer.answerText || "" : "",
            fileUrl: "", // Will be filled by backend after upload
          });
        } else if (typeof answer === "object" && (answer.fileUrl || answer.answerText)) {
          // File URL provided (Google Drive link, etc.)
          answers.push({
            questionId: qId,
            answerText: answer.answerText || "",
            fileUrl: answer.fileUrl || "",
          });
        } else {
          // Handle other types (TEXT, MCQ, CHECKBOX)
          answers.push({
            questionId: qId,
            answerText: Array.isArray(answer) ? answer.join(", ") : String(answer),
          });
        }
      });

      const request: ApplicationSubmitRequest = {
        recruitmentId: recruitment.id,
        teamId: selectedTeamId || undefined,
        answers,
      };

      await submitApplication(request, filesByQuestionId.size > 0 ? filesByQuestionId : undefined);
      setSubmitSuccess(true);
    } catch (err) {
      console.error("Error submitting application:", err);
      alert("Đã có lỗi xảy ra khi gửi đơn ứng tuyển. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">
            Đang tải thông tin tuyển dụng...
          </p>
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
                <CardTitle>Chọn phòng ban</CardTitle>
                <CardDescription>
                  Vui lòng chọn phòng ban bạn muốn ứng tuyển
                </CardDescription>
              </CardHeader>

              <CardContent>
                {loadingTeams ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
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
                )}
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
                        </Label>
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-200"
                        >
                          Bắt buộc
                        </Badge>
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
                          {/* File Upload Section */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                            <div className="text-center mb-4">
                              <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600 mb-1">
                                Tải file từ máy tính
                              </p>
                              <p className="text-xs text-gray-500">
                                Hỗ trợ: PDF, DOC, DOCX (tối đa 10MB)
                              </p>
                            </div>

                            <div className="flex flex-col items-center gap-3">
                              <input
                                type="file"
                                id={`file-upload-${question.id}`}
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 10 * 1024 * 1024) {
                                      alert(
                                        "File quá lớn! Vui lòng chọn file nhỏ hơn 10MB"
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
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Chọn file
                              </Button>

                              {uploadedFiles[question.id] && (
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
                                        {uploadedFiles[question.id].name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {(
                                          uploadedFiles[question.id].size / 1024
                                        ).toFixed(1)}{" "}
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

                          {/* Divider */}
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-2 bg-white text-gray-500">
                                hoặc
                              </span>
                            </div>
                          </div>

                          {/* Link Input Section */}
                          <div className="space-y-2">
                            <Label
                              htmlFor={`file-url-${question.id}`}
                              className="text-sm"
                            >
                              Link file (Google Drive, Dropbox, v.v.)
                            </Label>
                            <Input
                              id={`file-url-${question.id}`}
                              type="url"
                              placeholder="https://drive.google.com/file/..."
                              value={
                                uploadedFiles[question.id]
                                  ? ""
                                  : typeof formAnswers[question.id] === "object"
                                  ? formAnswers[question.id]?.fileUrl || ""
                                  : formAnswers[question.id] || ""
                              }
                              disabled={!!uploadedFiles[question.id]}
                              onChange={(e) => {
                                const fileUrl = e.target.value;
                                setFormAnswers((prev) => ({
                                  ...prev,
                                  [question.id]: {
                                    fileUrl: fileUrl,
                                    answerText: fileUrl,
                                  },
                                }));
                              }}
                              className={
                                uploadedFiles[question.id] ? "bg-gray-100" : ""
                              }
                            />
                            {uploadedFiles[question.id] && (
                              <p className="text-xs text-gray-500">
                                Đã chọn file từ máy tính. Xóa file để nhập link.
                              </p>
                            )}
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
                    <li>Bạn sẽ nhận được thông báo qua email về kết quả</li>
                  </ul>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <Button
                  onClick={handleSubmitApplication}
                  disabled={isSubmitting}
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
