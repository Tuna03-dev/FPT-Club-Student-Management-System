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
  preferredDate1: string; // Main defense date
  preferredDate2?: string; // Optional
  preferredDate3?: string; // Optional
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

    if (!formData.preferredDate1) {
      toast.error("Vui lòng chọn ngày bảo vệ!");
      return;
    }

    // Validate date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const defenseDate = new Date(formData.preferredDate1);
    if (defenseDate < today) {
      toast.error("Ngày bảo vệ phải là ngày trong tương lai!");
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
            Vui lòng chọn ngày và thời gian để bảo vệ đề án thành lập CLB.
          </p>

          <div className="space-y-2">
            <Label htmlFor="preferredDate1">
              Ngày bảo vệ <span className="text-red-500">*</span>
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
