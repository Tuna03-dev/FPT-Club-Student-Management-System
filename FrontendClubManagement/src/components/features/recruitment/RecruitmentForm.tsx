import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, XCircle, Trash2, Send, Loader2 } from "lucide-react";
import { type RecruitmentCreateRequest } from "@/services/recruitmentService";
import { getAllTeamsForPresident } from "@/api/teams";
import type { VisibleTeamDTO } from "@/types/team";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

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
  end_date: string;
  requirements?: string[];
  benefits?: string[];
  form_questions: EditableFormQuestion[];
  teamOptions?: Array<{ id: number; teamName: string; description?: string }>;
}

interface RecruitmentFormProps {
  clubId?: number;
  editingRecruitment: RecruitmentFormData | null;
  onSave: (data: RecruitmentCreateRequest, isEdit: boolean) => Promise<void>;
  onCancel: () => void;
  createLoading: boolean;
  editLoading?: boolean;
}

export function RecruitmentForm({
  clubId,
  editingRecruitment,
  onSave,
  onCancel,
  createLoading,
  editLoading = false,
}: RecruitmentFormProps) {
  // Form states for creating recruitment
  const [newRecruitment, setNewRecruitment] = useState({
    title: "",
    description: "",
    end_date: "",
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
  ]);

  // Teams state
  const [availableTeams, setAvailableTeams] = useState<VisibleTeamDTO[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Load teams when component mounts
  useEffect(() => {
    const fetchTeams = async () => {
      if (!clubId) return;

      try {
        setLoadingTeams(true);
        const teams = await getAllTeamsForPresident(clubId);
        setAvailableTeams(teams);
      } catch (error: any) {
        console.error("Error loading teams:", error);
        toast.error(error.message || "Không thể tải danh sách phòng ban");
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [clubId]);

  // Load data when editing - This effect handles form data loading
  useEffect(() => {
    if (editingRecruitment) {
      console.log("Loading editing recruitment data:", editingRecruitment);

      setNewRecruitment({
        title: editingRecruitment.title,
        description: editingRecruitment.description,
        end_date: editingRecruitment.end_date.slice(0, 16),
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
            ];

      setFormQuestions(questionsToLoad);

      // Load team options immediately if available
      if (
        editingRecruitment.teamOptions &&
        editingRecruitment.teamOptions.length > 0
      ) {
        console.log(
          "Setting team options from editing recruitment:",
          editingRecruitment.teamOptions
        );
        setSelectedTeamIds(editingRecruitment.teamOptions.map((t) => t.id));
      } else {
        console.log("No team options in editing recruitment");
        setSelectedTeamIds([]);
      }
    }
  }, [editingRecruitment]);

  // Reset form when explicitly cancelled or switching to create mode
  useEffect(() => {
    if (!editingRecruitment) {
      console.log("No editing recruitment, resetting form");
      setNewRecruitment({
        title: "",
        description: "",
        end_date: "",
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
      ]);
      setSelectedTeamIds([]);
    }
  }, [editingRecruitment]);

  const addRequirement = () => {
    setNewRecruitment((prev) => ({
      ...prev,
      requirements: [...prev.requirements, ""],
    }));
  };

  // const addBenefit = () => {
  //   setNewRecruitment((prev) => ({
  //     ...prev,
  //     benefits: [...prev.benefits, ""],
  //   }));
  // };

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
    if (!newRecruitment.end_date) {
      toast.error("Vui lòng chọn ngày kết thúc");
      return false;
    }

    // Validate end date is not in the past
    const endDate = new Date(newRecruitment.end_date);
    const now = new Date();
    if (endDate <= now) {
      toast.error("Ngày kết thúc phải sau thời điểm hiện tại");
      return false;
    }

    // Validate team selection
    if (availableTeams.length > 0 && selectedTeamIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một phòng ban cho đợt tuyển dụng");
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

    return true;
  };

  // Build request data
  const buildRequestData = (
    status: "DRAFT" | "OPEN"
  ): RecruitmentCreateRequest => {
    // Format end_date to ISO string without timezone (for Java LocalDateTime)
    // Input from datetime-local is "YYYY-MM-DDTHH:mm" (local time)
    // Backend expects ISO format: "YYYY-MM-DDTHH:mm:ss"
    const endDate = newRecruitment.end_date + ":00";

    return {
      title: newRecruitment.title,
      description: newRecruitment.description,
      endDate: endDate,
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
        isRequired: q.required ? 1 : 0, // Convert boolean to integer
        options:
          q.question_type === "MCQ" || q.question_type === "CHECKBOX"
            ? (q.options || []).filter((opt) => opt.trim())
            : undefined,
      })),
      teamOptionIds: selectedTeamIds,
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

  // Show skeleton when loading edit data
  if (editLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Basic Info Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Requirements Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Team Selection Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 border rounded-lg p-3"
                >
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Questions Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-9 w-10" />
                </div>
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-center pt-4">
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Skeleton */}
        <div className="flex gap-4 justify-end">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

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

          <div>
            <Label htmlFor="end_date">Ngày giờ kết thúc</Label>
            <Input
              id="end_date"
              type="datetime-local"
              value={newRecruitment.end_date}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) =>
                setNewRecruitment((prev) => ({
                  ...prev,
                  end_date: e.target.value,
                }))
              }
            />
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

      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lựa chọn phòng ban
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Chọn các phòng ban mà sinh viên có thể lựa chọn khi nộp đơn ứng
            tuyển. Sinh viên sẽ phải chọn một trong các phòng ban này khi nộp
            đơn. Nếu sinh viên được chấp nhận sẽ được xếp vào phòng ban đã chọn.
          </p>
        </CardHeader>
        <CardContent>
          {loadingTeams ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 border rounded-lg p-3"
                >
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : availableTeams.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
              <p className="text-red-600 font-medium">
                ⚠️ Chưa có phòng ban nào trong câu lạc bộ.
              </p>
              <p className="text-sm mt-2 text-red-500">
                Vui lòng tạo phòng ban trước khi thiết lập tuyển dụng.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableTeams.map((team) => (
                <div
                  key={team.teamId}
                  className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={`team-${team.teamId}`}
                    checked={selectedTeamIds.includes(team.teamId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTeamIds((prev) => [...prev, team.teamId]);
                      } else {
                        setSelectedTeamIds((prev) =>
                          prev.filter((id) => id !== team.teamId)
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`team-${team.teamId}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{team.teamName}</div>
                    {team.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {team.description}
                      </div>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {availableTeams.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              {selectedTeamIds.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  ✓ Đã chọn{" "}
                  <span className="font-semibold text-primary">
                    {selectedTeamIds.length}
                  </span>{" "}
                  phòng ban
                </p>
              ) : (
                <p className="text-sm text-red-500">
                  ⚠️ Vui lòng chọn ít nhất một phòng ban
                </p>
              )}
            </div>
          )}
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
                      <SelectItem value="MCQ">Lựa chọn 1 đáp án</SelectItem>
                      <SelectItem value="CHECKBOX">
                        Lựa chọn nhiều đáp án
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
                  <p className="font-medium mb-1">
                    📎 Lưu ý về câu hỏi tải file:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>
                      Ứng viên sẽ có thể tải lên file (PDF, Word, tối đa 10MB.)
                    </li>
                    <li>
                      Ứng viên có thể gửi link (Drive,..) nếu như vượt quá dung
                      lượng hoặc định dạng khác.
                    </li>
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
          disabled={createLoading || availableTeams.length === 0}
        >
          Lưu bản nháp
        </Button>
        <Button
          onClick={handlePublish}
          disabled={createLoading || availableTeams.length === 0}
        >
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

      {availableTeams.length === 0 && !loadingTeams && (
        <div className="text-center text-sm text-red-500 mt-2">
          💡 Cần có ít nhất một phòng ban để tạo đợt tuyển dụng
        </div>
      )}
    </div>
  );
}
