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
import {
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  getRecruitmentById,
  submitApplication,
  type RecruitmentData,
  type ApplicationSubmitRequest,
} from "@/service/RecruitmentService";
import { getClubDetailById, type ClubDetailData } from "@/service/ClubService";

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

  const handleSubmitApplication = async () => {
    if (!recruitment) return;

    // Validate required questions
    const requiredQuestions =
      recruitment.questions?.filter(
        (q) => q.questionType !== "FILE" // Assuming all questions are required
      ) || [];

    const allAnswered = requiredQuestions.every((q) => formAnswers[q.id]);

    if (!allAnswered) {
      alert("Vui lòng trả lời đầy đủ tất cả các câu hỏi");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare answers for API
      const answers = Object.entries(formAnswers).map(
        ([questionId, answer]) => ({
          questionId: Number(questionId),
          answerText: Array.isArray(answer)
            ? answer.join(", ")
            : String(answer),
        })
      );

      const request: ApplicationSubmitRequest = {
        recruitmentId: recruitment.id,
        answers,
      };

      await submitApplication(request);
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
                        <Badge variant="destructive" className="ml-2">
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
