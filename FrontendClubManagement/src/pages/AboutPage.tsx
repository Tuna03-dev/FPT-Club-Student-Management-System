// src/pages/AboutPage.tsx
import { useEffect, useState } from "react";
import {
  adminDepartmentService,
  type AdminDepartmentResponse,
} from "@/services/adminDepartmentService";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube } from "lucide-react";
import { toast } from "sonner";

const AboutPage = () => {
  const [department, setDepartment] = useState<AdminDepartmentResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ID phòng ban ICPDP (có thể thay đổi tùy theo dữ liệu thực tế)
  const ICPDP_DEPARTMENT_ID = 1;

  useEffect(() => {
    const fetchDepartmentInfo = async () => {
      try {
        setLoading(true);
        const response = await adminDepartmentService.getDepartmentById(
          ICPDP_DEPARTMENT_ID
        );

        if (response.code === 200 && response.data) {
          setDepartment(response.data);
        } else {
          setError("Không thể tải thông tin phòng ban");
        }
      } catch (err) {
        console.error("Error fetching department info:", err);
        setError("Đã xảy ra lỗi khi tải thông tin");
        toast.error("Không thể tải thông tin phòng ban");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="space-y-8 animate-pulse">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-48 bg-muted rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-32 bg-muted rounded-lg" />
              <div className="h-32 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Không thể tải thông tin
            </h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      {department.bannerUrl && (
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img
            src={department.bannerUrl}
            alt={department.departmentName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-12 -mt-20 relative z-10">
        {/* Header Card */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {department.avatarUrl && (
                <img
                  src={department.avatarUrl}
                  alt={department.departmentName}
                  className="w-32 h-32 rounded-lg object-cover shadow-md"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold   bg-clip-text ">
                    {department.departmentName}
                  </h1>
                </div>
                <p className="text-lg text-muted-foreground mb-4">
                  {department.departmentCode}
                </p>
                {department.sortDescription && (
                  <p className="text-foreground leading-relaxed">
                    {department.sortDescription}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Contact Details */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Thông tin liên hệ
              </h2>
              <div className="space-y-4">
                {department.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${department.email}`}
                        className="text-primary hover:underline"
                      >
                        {department.email}
                      </a>
                    </div>
                  </div>
                )}
                {department.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Điện thoại
                      </p>
                      <a
                        href={`tel:${department.phone}`}
                        className="text-primary hover:underline"
                      >
                        {department.phone}
                      </a>
                    </div>
                  </div>
                )}
                {department.campus && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cơ sở</p>
                      <p className="font-medium">{department.campus.campusName}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Mạng xã hội</h2>
              <div className="space-y-3">
                {department.fbLink && (
                  <a
                    href={department.fbLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-blue-500 text-white">
                      <Facebook className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Facebook</p>
                      <p className="text-sm text-muted-foreground">
                        Theo dõi chúng tôi trên Facebook
                      </p>
                    </div>
                  </a>
                )}
                {department.igLink && (
                  <a
                    href={department.igLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      <Instagram className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Instagram</p>
                      <p className="text-sm text-muted-foreground">
                        Theo dõi chúng tôi trên Instagram
                      </p>
                    </div>
                  </a>
                )}
                {department.ytLink && (
                  <a
                    href={department.ytLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-red-500 text-white">
                      <Youtube className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">YouTube</p>
                      <p className="text-sm text-muted-foreground">
                        Xem video của chúng tôi
                      </p>
                    </div>
                  </a>
                )}
                {department.ttLink && (
                  <a
                    href={department.ttLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-black text-white">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">TikTok</p>
                      <p className="text-sm text-muted-foreground">
                        Theo dõi chúng tôi trên TikTok
                      </p>
                    </div>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Giới thiệu</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                {department.sortDescription ||
                  "Phòng Phát triển Văn hoá Sinh viên (ICPDP) là đơn vị chịu trách nhiệm tổ chức và quản lý các hoạt động ngoại khóa, câu lạc bộ sinh viên tại Đại học FPT. Chúng tôi cam kết tạo ra môi trường học tập và phát triển toàn diện cho sinh viên thông qua các hoạt động văn hóa, thể thao và các câu lạc bộ đa dạng."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutPage;
