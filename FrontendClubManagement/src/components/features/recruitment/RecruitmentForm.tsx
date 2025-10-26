import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  XCircle,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import {
  type RecruitmentCreateRequest,
} from "@/service/RecruitmentService";
import { toast } from "sonner";

type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "FILE";

type EditableFormQuestion = {
  form_id?: string;
  question_text: string;
  question_type: QuestionType;
  question_order: number;
  options?: string[];
  required?: boolean;
};

interface RecruitmentFormData {
  recruitment_id?: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  max_applications?: number;
  requirements?: string[];
  benefits?: string[];
  form_questions: EditableFormQuestion[];
}

interface RecruitmentFormProps {
  editingRecruitment: RecruitmentFormData | null;
  onSave: (data: RecruitmentCreateRequest, isEdit: boolean) => Promise<void>;
  onCancel: () => void;
  createLoading: boolean;
}

export function RecruitmentForm({
  editingRecruitment,
  onSave,
  onCancel,
  createLoading,
}: RecruitmentFormProps) {
  // Form states for creating recruitment
  const [newRecruitment, setNewRecruitment] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    max_applications: "",
    requirements: [""],
    benefits: [""],
  });

  const [formQuestions, setFormQuestions] = useState<EditableFormQuestion[]>([
    {
      question_text: "Tại sao bạn muốn tham gia câu lạc bộ?",
      question_type: "TEXT",
      question_order: 1,
      required: true,
    },
    {
      question_text: "Bạn muốn tham gia phòng ban nào?",
      question_type: "MCQ",
      question_order: 2,
      options: [
        "Ban Chuyên môn",
        "Ban Truyền thông",
        "Ban Tổ chức",
        "Ban Nội vụ",
        "Ban Đối ngoại",
      ],
      required: true,
    },
  ]);

  // Load data when editing
  useEffect(() => {
    if (editingRecruitment) {
      setNewRecruitment({
        title: editingRecruitment.title,
        description: editingRecruitment.description,
        start_date: editingRecruitment.start_date.split("T")[0],
        end_date: editingRecruitment.end_date.split("T")[0],
        max_applications: editingRecruitment.max_applications?.toString() || "",
        requirements: editingRecruitment.requirements?.length
          ? editingRecruitment.requirements
          : [""],
        benefits: editingRecruitment.benefits?.length
          ? editingRecruitment.benefits
          : [""],
      });

      const questionsToLoad =
        editingRecruitment.form_questions &&
        editingRecruitment.form_questions.length > 0
          ? editingRecruitment.form_questions
          : [
              {
                question_text: "Tại sao bạn muốn tham gia câu lạc bộ?",
                question_type: "TEXT" as QuestionType,
                question_order: 1,
                required: true,
              },
              {
                question_text: "Bạn muốn tham gia phòng ban nào?",
                question_type: "MCQ" as QuestionType,
                question_order: 2,
                options: [
                  "Ban Chuyên môn",
                  "Ban Truyền thông",
                  "Ban Tổ chức",
                  "Ban Nội vụ",
                  "Ban Đối ngoại",
                ],
                required: true,
              },
            ];

      setFormQuestions(questionsToLoad);
    } else {
      // Reset to default for new recruitment
      resetForm();
    }
  }, [editingRecruitment]);

  const resetForm = () => {
    setNewRecruitment({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      max_applications: "",
      requirements: [""],
      benefits: [""],
    });
    setFormQuestions([
      {
        question_text: "Tại sao bạn muốn tham gia câu lạc bộ?",
        question_type: "TEXT",
        question_order: 1,
        required: true,
      },
      {
        question_text: "Bạn muốn tham gia phòng ban nào?",
        question_type: "MCQ",
        question_order: 2,
        options: [
          "Ban Chuyên môn",
          "Ban Truyền thông",
          "Ban Tổ chức",
          "Ban Nội vụ",
          "Ban Đối ngoại",
        ],
        required: true,
      },
    ]);
  };

  const addRequirement = () => {
    setNewRecruitment((prev) => ({
      ...prev,
      requirements: [...prev.requirements, ""],
    }));
  };

  const addBenefit = () => {
    setNewRecruitment((prev) => ({
      ...prev,
      benefits: [...prev.benefits, ""],
    }));
  };

  const addQuestion = () => {
    setFormQuestions((prev) => [
      ...prev,
      {
        question_text: "",
        question_type: "TEXT",
        question_order: prev.length + 1,
        required: false,
      },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => {
        if (i === index) {
          const updated = { ...q, [field]: value };
          // Initialize options array when changing to MCQ or CHECKBOX
          if (
            field === "question_type" &&
            (value === "MCQ" || value === "CHECKBOX")
          ) {
            if (!updated.options || updated.options.length === 0) {
              updated.options = [""];
            }
          }
          // Clear options when changing to other types
          if (
            field === "question_type" &&
            value !== "MCQ" &&
            value !== "CHECKBOX"
          ) {
            updated.options = undefined;
          }
          return updated;
        }
        return q;
      })
    );
  };

  const removeQuestion = (index: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    setFormQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex ? { ...q, options: [...(q.options || []), ""] } : q
      )
    );
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => {
        if (i === questionIndex) {
          const newOptions = [...(q.options || [])];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => {
        if (i === questionIndex) {
          return {
            ...q,
            options: (q.options || []).filter((_, oi) => oi !== optionIndex),
          };
        }
        return q;
      })
    );
  };

  // Validation logic
  const validateForm = (): boolean => {
    // Validation
    if (!newRecruitment.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề đợt tuyển dụng");
      return false;
    }
    if (!newRecruitment.description.trim()) {
      toast.error("Vui lòng nhập mô tả đợt tuyển dụng");
      return false;
    }
    if (!newRecruitment.start_date) {
      toast.error("Vui lòng chọn ngày bắt đầu");
      return false;
    }
    if (!newRecruitment.end_date) {
      toast.error("Vui lòng chọn ngày kết thúc");
      return false;
    }

    // Validate questions
    for (let i = 0; i < formQuestions.length; i++) {
      const q = formQuestions[i];
      if (!q.question_text.trim()) {
        toast.error(`Vui lòng nhập nội dung câu hỏi ${i + 1}`);
        return false;
      }
      if (q.question_type === "MCQ" || q.question_type === "CHECKBOX") {
        if (!q.options || q.options.length === 0) {
          toast.error(`Câu hỏi ${i + 1}: Vui lòng thêm ít nhất một lựa chọn`);
          return false;
        }
        const validOptions = q.options.filter((opt) => opt.trim());
        if (validOptions.length === 0) {
          toast.error(
            `Câu hỏi ${i + 1}: Vui lòng nhập nội dung cho các lựa chọn`
          );
          return false;
        }
        if (validOptions.length < 2) {
          toast.error(`Câu hỏi ${i + 1}: Cần ít nhất 2 lựa chọn`);
          return false;
        }
      }
    }

    // Validate dates
    const startDate = new Date(newRecruitment.start_date);
    const endDate = new Date(newRecruitment.end_date);
    if (startDate >= endDate) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
      return false;
    }

    return true;
  };

  // Build request data
  const buildRequestData = (status: "DRAFT" | "OPEN"): RecruitmentCreateRequest => {
    const startDate = new Date(newRecruitment.start_date).toISOString();
    const endDate = new Date(newRecruitment.end_date).toISOString();

    return {
      title: newRecruitment.title,
      description: newRecruitment.description,
      startDate: startDate,
      endDate: endDate,
      maxApplicants: newRecruitment.max_applications
        ? parseInt(newRecruitment.max_applications)
        : undefined,
      requirements: newRecruitment.requirements
        .filter((r) => r.trim())
        .join("\n"),
      status: status,
      questions: formQuestions.map((q, index) => ({
        id: q.form_id ? parseInt(q.form_id) : null,
        questionText: q.question_text,
        questionType:
          q.question_type === "FILE" ? "FILE_UPLOAD" : q.question_type,
        questionOrder: index + 1,
        options:
          q.question_type === "MCQ" || q.question_type === "CHECKBOX"
            ? (q.options || []).filter((opt) => opt.trim())
            : undefined,
      })),
    };
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    const requestData = buildRequestData("DRAFT");
    await onSave(requestData, !!editingRecruitment);
  };

  // Handle publish
  const handlePublish = async () => {
    if (!validateForm()) return;
    const requestData = buildRequestData("OPEN");
    await onSave(requestData, !!editingRecruitment);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Form Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {editingRecruitment
              ? "Chỉnh sửa đợt tuyển dụng"
              : "Tạo đợt tuyển dụng mới"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {editingRecruitment
              ? "Cập nhật thông tin đợt tuyển dụng"
              : "Điền thông tin để tạo đợt tuyển dụng mới"}
          </p>
        </div>
        {editingRecruitment && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-transparent"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Hủy chỉnh sửa
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Tiêu đề đợt tuyển dụng</Label>
            <Input
              id="title"
              value={newRecruitment.title}
              onChange={(e) =>
                setNewRecruitment((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="VD: Tuyển thành viên mới kỳ Fall 2024"
            />
          </div>

          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={newRecruitment.description}
              onChange={(e) =>
                setNewRecruitment((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Mô tả chi tiết về đợt tuyển dụng..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="start_date">Ngày bắt đầu</Label>
              <Input
                id="start_date"
                type="date"
                value={newRecruitment.start_date}
                onChange={(e) =>
                  setNewRecruitment((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="end_date">Ngày kết thúc</Label>
              <Input
                id="end_date"
                type="date"
                value={newRecruitment.end_date}
                onChange={(e) =>
                  setNewRecruitment((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="max_applications">Số lượng tối đa</Label>
              <Input
                id="max_applications"
                type="number"
                value={newRecruitment.max_applications}
                onChange={(e) =>
                  setNewRecruitment((prev) => ({
                    ...prev,
                    max_applications: e.target.value,
                  }))
                }
                placeholder="50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Yêu cầu
            <Button
              variant="outline"
              size="sm"
              onClick={addRequirement}
              className="bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm yêu cầu
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {newRecruitment.requirements.map((req, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={req}
                onChange={(e) => {
                  const newReqs = [...newRecruitment.requirements];
                  newReqs[index] = e.target.value;
                  setNewRecruitment((prev) => ({
                    ...prev,
                    requirements: newReqs,
                  }));
                }}
                placeholder="Nhập yêu cầu..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newReqs = newRecruitment.requirements.filter(
                    (_, i) => i !== index
                  );
                  setNewRecruitment((prev) => ({
                    ...prev,
                    requirements: newReqs,
                  }));
                }}
                className="bg-transparent"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Form Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Câu hỏi trong đơn ứng tuyển</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {formQuestions.map((question, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Câu hỏi {index + 1}</Label>
                  {editingRecruitment && !question.form_id && (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      Mới
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                  className="bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Input
                value={question.question_text}
                onChange={(e) =>
                  updateQuestion(index, "question_text", e.target.value)
                }
                placeholder="Nhập câu hỏi..."
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loại câu hỏi</Label>
                  <Select
                    value={question.question_type}
                    onValueChange={(value) =>
                      updateQuestion(index, "question_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Văn bản</SelectItem>
                      <SelectItem value="MCQ">
                        Trắc nghiệm (1 đáp án)
                      </SelectItem>
                      <SelectItem value="CHECKBOX">
                        Trắc nghiệm (nhiều đáp án)
                      </SelectItem>
                      <SelectItem value="FILE">Tải lên file</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id={`required-${index}`}
                    checked={question.required}
                    onChange={(e) =>
                      updateQuestion(index, "required", e.target.checked)
                    }
                  />
                  <Label htmlFor={`required-${index}`}>Bắt buộc</Label>
                </div>
              </div>

              {(question.question_type === "MCQ" ||
                question.question_type === "CHECKBOX") && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Các lựa chọn</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(index)}
                      className="bg-transparent"
                      type="button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm lựa chọn
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(question.options || []).map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex gap-2 items-center"
                      >
                        <span className="text-sm text-muted-foreground w-6">
                          {optionIndex + 1}.
                        </span>
                        <Input
                          value={option}
                          onChange={(e) =>
                            updateOption(index, optionIndex, e.target.value)
                          }
                          placeholder={`Lựa chọn ${optionIndex + 1}`}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index, optionIndex)}
                          className="bg-transparent"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!question.options || question.options.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                        Chưa có lựa chọn nào. Click "Thêm lựa chọn" để bắt đầu.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {question.question_type === "FILE" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">📎 Lưu ý về câu hỏi tải file:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Ứng viên sẽ có thể tải lên file (PDF, Word, ảnh, v.v.)</li>
                    <li>
                      Nên chỉ định rõ loại file và kích thước tối đa trong câu
                      hỏi
                    </li>
                    <li>Ví dụ: "Tải lên CV của bạn (PDF, tối đa 5MB)"</li>
                  </ul>
                </div>
              )}
            </div>
          ))}

          {/* Add Question Button */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={addQuestion}
              className="bg-transparent border-dashed border-2 hover:border-primary "
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm câu hỏi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          className="bg-transparent"
          disabled={createLoading}
        >
          Hủy
        </Button>
        <Button
          variant="outline"
          className="bg-transparent"
          onClick={handleSaveDraft}
          disabled={createLoading}
        >
          Lưu bản nháp
        </Button>
        <Button onClick={handlePublish} disabled={createLoading}>
          {createLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {editingRecruitment ? "Đang cập nhật..." : "Đang tạo..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {editingRecruitment ? "Cập nhật" : "Tạo và Công bố"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

