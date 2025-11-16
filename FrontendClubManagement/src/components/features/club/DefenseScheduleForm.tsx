import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Send } from "lucide-react";
import { toast } from "sonner";

interface DefenseScheduleFormProps {
  requestId: string;
  onSubmit: (data: DefenseScheduleData) => void;
}

export interface DefenseScheduleData {
  requestId: string;
  preferredDate1: string;
  preferredDate2: string;
  preferredDate3: string;
  notes?: string;
}

export function DefenseScheduleForm({
  requestId,
  onSubmit,
}: DefenseScheduleFormProps) {
  const [formData, setFormData] = useState<DefenseScheduleData>({
    requestId,
    preferredDate1: "",
    preferredDate2: "",
    preferredDate3: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.preferredDate1 ||
      !formData.preferredDate2 ||
      !formData.preferredDate3
    ) {
      toast.error("Vui lòng chọn đầy đủ 3 ngày mong muốn!");
      return;
    }

    // Validate dates are in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = [
      new Date(formData.preferredDate1),
      new Date(formData.preferredDate2),
      new Date(formData.preferredDate3),
    ];

    if (dates.some((date) => date < today)) {
      toast.error("Ngày bảo vệ phải là ngày trong tương lai!");
      return;
    }

    // Validate dates are different
    const uniqueDates = new Set(dates.map((d) => d.getTime()));
    if (uniqueDates.size !== 3) {
      toast.error("Vui lòng chọn 3 ngày khác nhau!");
      return;
    }

    onSubmit(formData);
    toast.success("Đã gửi đề xuất lịch bảo vệ thành công!");
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Đề xuất lịch bảo vệ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vui lòng chọn 3 ngày mong muốn để bảo vệ đề án thành lập CLB. Ban
            quản lý sẽ chọn một trong các ngày phù hợp nhất.
          </p>

          <div className="space-y-2">
            <Label htmlFor="preferredDate1">
              Ngày mong muốn thứ 1 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="preferredDate1"
              name="preferredDate1"
              type="date"
              min={minDate}
              value={formData.preferredDate1}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredDate2">
              Ngày mong muốn thứ 2 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="preferredDate2"
              name="preferredDate2"
              type="date"
              min={minDate}
              value={formData.preferredDate2}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredDate3">
              Ngày mong muốn thứ 3 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="preferredDate3"
              name="preferredDate3"
              type="date"
              min={minDate}
              value={formData.preferredDate3}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Thời gian cụ thể, yêu cầu đặc biệt..."
              rows={3}
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            <Send className="mr-2 h-4 w-4" />
            Gửi đề xuất
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
