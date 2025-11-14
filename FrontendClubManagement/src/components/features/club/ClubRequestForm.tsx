import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface ClubRequestFormProps {
  onSubmit: (formData: ClubRequestFormData) => void;
}

export interface ClubRequestFormData {
  clubName: string;
  clubCode: string;
  category: string;
  description: string;
  targetMembers: string;
  email: string;
  phone: string;
  facebookLink?: string;
  instagramLink?: string;
  tiktokLink?: string;
}

export function ClubRequestForm({ onSubmit }: ClubRequestFormProps) {
  const [formData, setFormData] = useState<ClubRequestFormData>({
    clubName: "",
    clubCode: "",
    category: "",
    description: "",
    targetMembers: "",
    email: "",
    phone: "",
    facebookLink: "",
    instagramLink: "",
    tiktokLink: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.clubName ||
      !formData.clubCode ||
      !formData.category ||
      !formData.description ||
      !formData.targetMembers ||
      !formData.email ||
      !formData.phone
    ) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    onSubmit(formData);

    // Reset form
    setFormData({
      clubName: "",
      clubCode: "",
      category: "",
      description: "",
      targetMembers: "",
      email: "",
      phone: "",
      facebookLink: "",
      instagramLink: "",
      tiktokLink: "",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Thông tin câu lạc bộ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clubName">
                Tên CLB <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clubName"
                name="clubName"
                placeholder="VD: CLB Lập trình FPT"
                value={formData.clubName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clubCode">
                Mã CLB <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clubCode"
                name="clubCode"
                placeholder="VD: FPTU_CODING"
                value={formData.clubCode}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Lĩnh vực hoạt động <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn lĩnh vực" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technology">Công nghệ</SelectItem>
                <SelectItem value="sports">Thể thao</SelectItem>
                <SelectItem value="arts">Nghệ thuật</SelectItem>
                <SelectItem value="social">Xã hội</SelectItem>
                <SelectItem value="academic">Học thuật</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Mô tả hoạt động <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Mô tả chi tiết về hoạt động và mục tiêu của CLB..."
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetMembers">
              Đối tượng hướng tới <span className="text-red-500">*</span>
            </Label>
            <Input
              id="targetMembers"
              name="targetMembers"
              placeholder="VD: Sinh viên yêu thích lập trình, muốn phát triển kỹ năng coding"
              value={formData.targetMembers}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email liên hệ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="club@fpt.edu.vn"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Số điện thoại <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="0123456789"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Mạng xã hội (không bắt buộc)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                name="facebookLink"
                placeholder="Facebook URL"
                value={formData.facebookLink}
                onChange={handleChange}
              />
              <Input
                name="instagramLink"
                placeholder="Instagram URL"
                value={formData.instagramLink}
                onChange={handleChange}
              />
              <Input
                name="tiktokLink"
                placeholder="TikTok URL"
                value={formData.tiktokLink}
                onChange={handleChange}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg">
            <Send className="mr-2 h-4 w-4" />
            Gửi đơn đăng ký
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
