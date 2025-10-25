"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, AlertCircle, CheckCircle } from "lucide-react";

interface FormQuestion {
  id: string;
  questionText: string;
  questionType: "TEXT" | "MCQ" | "CHECKBOX";
  options?: string[];
  required: boolean;
  order: number;
}

interface ClubInfo {
  clubId: string;
  clubName: string;
  clubImage: string;
  description: string;
  requirements: string[];
  recruitmentTitle: string;
}

interface ClubApplicationFormProps {
  clubId: string;
  onBack?: () => void;
}

export function ClubApplicationForm({
  clubId,
  onBack,
}: ClubApplicationFormProps) {
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    fullName: "",
    studentId: "",
    email: "",
    phone: "",
  });

  // Mock club data - thay thế bằng API call thực tế
  const clubInfo: ClubInfo = {
    clubId: clubId,
    clubName: "CLB Lập trình FPT",
    clubImage: "/programming-club.jpg",
    description:
      "Câu lạc bộ dành cho những bạn đam mê lập trình, muốn học hỏi và phát triển kỹ năng công nghệ",
    requirements: [
      "Sinh viên năm 1-3 tại FPT University",
      "Có kiến thức cơ bản về lập trình",
      "Cam kết tham gia hoạt động của CLB",
      "Sẵn sàng học hỏi và chia sẻ kinh nghiệm",
    ],
    recruitmentTitle: "Tuyển thành viên mới - Kỳ 1/2024",
  };

  const formQuestions: FormQuestion[] = [
    {
      id: "1",
      questionText: "Tại sao bạn muốn tham gia CLB Lập trình FPT?",
      questionType: "TEXT",
      required: true,
      order: 1,
    },
    {
      id: "2",
      questionText: "Bạn có kinh nghiệm với ngôn ngữ lập trình nào?",
      questionType: "MCQ",
      options: [
        "JavaScript",
        "Python",
        "Java",
        "C++",
        "C#",
        "Chưa có kinh nghiệm",
      ],
      required: true,
      order: 2,
    },
    {
      id: "3",
      questionText:
        "Bạn có thể tham gia các hoạt động nào? (Chọn nhiều đáp án)",
      questionType: "CHECKBOX",
      options: [
        "Workshop",
        "Hackathon",
        "Dự án nhóm",
        "Mentoring",
        "Tổ chức sự kiện",
      ],
      required: true,
      order: 3,
    },
    {
      id: "4",
      questionText: "Mô tả về bản thân, mục tiêu học tập và kỳ vọng từ CLB",
      questionType: "TEXT",
      required: false,
      order: 4,
    },
  ];

  const handleSubmitApplication = async () => {
    // Validate required fields
    const requiredQuestions = formQuestions.filter((q) => q.required);
    const allAnswered = requiredQuestions.every((q) => formAnswers[q.id]);
    const studentInfoComplete =
      studentInfo.fullName && studentInfo.studentId && studentInfo.email;

    if (!allAnswered || !studentInfoComplete) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      console.log("[v0] Application submitted:", {
        clubId,
        studentInfo,
        answers: formAnswers,
      });
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 1500);
  };

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
              Đơn ứng tuyển của bạn đã được gửi đến {clubInfo.clubName}. Chúng
              tôi sẽ xem xét và liên hệ với bạn trong vòng 3-5 ngày làm việc.
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
              <p className="text-muted-foreground">{clubInfo.clubName}</p>
            </div>
          </div>

          {/* Club Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <img
                  src={clubInfo.clubImage || "/placeholder.svg"}
                  alt={clubInfo.clubName}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <CardTitle className="text-xl">
                    {clubInfo.recruitmentTitle}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {clubInfo.description}
                  </CardDescription>
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Yêu cầu:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {clubInfo.requirements.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Application Form */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Vui lòng điền thông tin của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Họ và tên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Nhập họ và tên"
                    value={studentInfo.fullName}
                    onChange={(e) =>
                      setStudentInfo({
                        ...studentInfo,
                        fullName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">
                    Mã sinh viên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="studentId"
                    placeholder="Ví dụ: SE123456"
                    value={studentInfo.studentId}
                    onChange={(e) =>
                      setStudentInfo({
                        ...studentInfo,
                        studentId: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@fpt.edu.vn"
                    value={studentInfo.email}
                    onChange={(e) =>
                      setStudentInfo({ ...studentInfo, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    placeholder="0123456789"
                    value={studentInfo.phone}
                    onChange={(e) =>
                      setStudentInfo({ ...studentInfo, phone: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
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
              {formQuestions
                .sort((a, b) => a.order - b.order)
                .map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Label className="text-base font-medium">
                        {index + 1}. {question.questionText}
                      </Label>
                      {question.required && (
                        <Badge variant="destructive" className="ml-2">
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

                    {question.questionType === "MCQ" && (
                      <RadioGroup
                        value={formAnswers[question.id] || ""}
                        onValueChange={(value) =>
                          setFormAnswers((prev) => ({
                            ...prev,
                            [question.id]: value,
                          }))
                        }
                      >
                        {question.options?.map((option, optIndex) => (
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

                    {question.questionType === "CHECKBOX" && (
                      <div className="space-y-2">
                        {question.options?.map((option, optIndex) => (
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
                                    [question.id]: [...currentAnswers, option],
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
                ))}

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
