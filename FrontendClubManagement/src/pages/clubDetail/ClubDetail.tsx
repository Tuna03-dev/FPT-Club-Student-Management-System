"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  MapPin,
  Users,
  MessageSquare,
  Clock,
  Zap,
  Award,
  TrendingUp,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getClubDetailById, type ClubDetailData } from "@/services/clubService";
import {
  getRecruitmentsByClubId,
  type RecruitmentData,
  getMyApplications,
} from "@/services/recruitmentService";
import { ClubApplicationForm } from "./ClubApplication";
import { useMyClubs } from "@/hooks/useMyClubs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { authService } from "@/services/authService";

interface ClubDetailProps {
  clubId?: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  attendees: number;
  image: string;
}

interface News {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  image: string;
  views: number;
  likes: number;
}

// interface RecruitmentInfo {
//   id: string;
//   position: string;
//   department: string;
//   requirements: string[];
//   deadline: string;
//   spots: number;
//   applicants: number;
// }

export function ClubDetail({ clubId: propClubId }: ClubDetailProps) {
  const params = useParams();
  const clubId = propClubId || params.clubId;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<ClubDetailData | null>(null);
  const [recruitments, setRecruitments] = useState<RecruitmentData[]>([]);
  const [recruitmentsLoaded, setRecruitmentsLoaded] = useState(false);
  const [loadingRecruitments, setLoadingRecruitments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecruitmentId, setSelectedRecruitmentId] = useState<
    number | null
  >(null);
  const [showMembershipWarning, setShowMembershipWarning] = useState(false);
  const [showAlreadyAppliedDialog, setShowAlreadyAppliedDialog] = useState(false);
  const [alreadyAppliedMessage, setAlreadyAppliedMessage] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const formatRecruitmentStatus = (status?: string) => {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s === "open") return "Đang mở";
    if (s === "closed") return "Đã đóng";
    if (s === "draft") return "Bản nháp";
    if (s === "cancelled" || s === "canceled") return "Đã hủy";
    return status;
  };

  const normalizeRequirements = (req?: string | string[]) => {
    if (!req) return [] as string[];
    if (Array.isArray(req)) return req.filter(Boolean);
    // Split by line breaks or bullets/semicolons and trim
    return req
      .split(/\r?\n|;|•|\u2022|-/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Get user's clubs to check if already a member
  const { data: myClubs } = useMyClubs();

  // Fetch club data only (isRecruiting is included in response)
  useEffect(() => {
    const fetchClubData = async () => {
      if (!clubId) {
        setError("Club ID not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const clubData = await getClubDetailById(Number(clubId));
        setClub(clubData);
        // Note: clubData.isRecruiting is already set by Backend
      } catch (err) {
        console.error("Error fetching club data:", err);
        setError("Không thể tải thông tin câu lạc bộ");
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, [clubId]);

  // Fetch recruitments when tab is clicked
  const fetchRecruitments = async () => {
    if (recruitmentsLoaded || !clubId) return;

    try {
      setLoadingRecruitments(true);
      const recruitmentsResponse = await getRecruitmentsByClubId(
        Number(clubId),
        { status: "OPEN", page: 0, size: 20 }
      );
      setRecruitments(recruitmentsResponse.content);
      setRecruitmentsLoaded(true);
    } catch (err) {
      console.error("Error fetching recruitments:", err);
    } finally {
      setLoadingRecruitments(false);
    }
  };

  // Load recruitments when recruitment tab is activated
  useEffect(() => {
    if (activeTab === "recruitment") {
      fetchRecruitments();
    }
  }, [activeTab]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "recruitment") {
      setActiveTab("recruitment");
    }
  }, [searchParams]);

  useEffect(() => {
    // When recruitment tab is active and list loaded, try to scroll to anchor
    if (activeTab !== "recruitment") return;
    if (!recruitmentsLoaded) return;
    const hash = window.location.hash;
    if (hash && hash.startsWith("#recruitment-")) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    }
  }, [activeTab, recruitmentsLoaded]);

  const events: Event[] = [
    {
      id: "1",
      title: "Cuộc thi lập trình ACM ICPC 2024",
      date: "2024-02-20",
      time: "08:00 - 17:00",
      location: "Phòng Lab 301, Tòa A",
      description:
        "Cuộc thi lập trình cấp trường với các bài toán thử thách từ dễ đến khó",
      attendees: 45,
      image: "/programming-competition.jpg",
    },
    {
      id: "2",
      title: "Workshop: React Advanced Patterns",
      date: "2024-02-15",
      time: "14:00 - 16:30",
      location: "Phòng 205, Tòa B",
      description:
        "Tìm hiểu các pattern nâng cao trong React từ các chuyên gia",
      attendees: 32,
      image: "/react-workshop.jpg",
    },
    {
      id: "3",
      title: "Hackathon: Build Your Startup",
      date: "2024-03-01",
      time: "09:00 - 21:00",
      location: "Hội trường A",
      description: "Hackathon 12 tiếng để xây dựng ý tưởng startup của bạn",
      attendees: 120,
      image: "/hackathon-event.png",
    },
  ];

  const news: News[] = [
    {
      id: "1",
      title: "CLB Lập trình đạt giải Nhất cuộc thi Code Challenge 2024",
      content:
        "Với sự chuẩn bị kỹ lưỡng và tinh thần đoàn kết, đội tuyển CLB Lập trình đã xuất sắc giành giải Nhất tại cuộc thi Code Challenge 2024 cấp trường...",
      date: "2024-01-18",
      author: "Nguyễn Văn A",
      image: "/award-winning.jpg",
      views: 234,
      likes: 45,
    },
    {
      id: "2",
      title: "Thông báo tuyển thành viên mới - Kỳ Spring 2024",
      content:
        "CLB Lập trình FPT thông báo tuyển thành viên mới cho kỳ Spring 2024. Chúng tôi đang tìm kiếm những sinh viên đam mê lập trình...",
      date: "2024-01-15",
      author: "Trần Thị B",
      image: "/recruitment-concept.png",
      views: 567,
      likes: 89,
    },
    {
      id: "3",
      title: "Kết quả cuộc bình chọn: Chọn dự án tốt nhất của CLB",
      content:
        "Sau 2 tuần bình chọn, dự án 'Smart Study Assistant' của nhóm Nguyễn Văn C đã giành chiến thắng với 234 phiếu bình chọn...",
      date: "2024-01-10",
      author: "Lê Văn C",
      image: "/voting-results.jpg",
      views: 345,
      likes: 67,
    },
  ];

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  // Format number helper (add comma separator)
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("vi-VN");
  };

  // Check if user is already a member of this club
  const isAlreadyMember = () => {
    if (!myClubs || !clubId) return false;
    return myClubs.some((myClub) => myClub.clubId === Number(clubId));
  };

  // Handle recruitment application click
  const handleApplyClick = async (recruitmentId: number) => {
    // Prompt login if not authenticated
    if (!authService.isAuthenticated()) {
      setShowLoginPrompt(true);
      return;
    }
    // Check if user is already a member
    if (isAlreadyMember()) {
      setShowMembershipWarning(true);
      return;
    }
    // Kiểm tra đã nộp đơn chưa
    try {
      const myApps = await getMyApplications({ page: 0, size: 20 });
      const existed = myApps.content.find(app => app.recruitmentId === recruitmentId);
      if (existed) {
        setAlreadyAppliedMessage("Bạn đã nộp đơn ứng tuyển cho đợt này. Không thể nộp lại.");
        setShowAlreadyAppliedDialog(true);
        return;
      }
    } catch (e) {
      // Có thể show lỗi hoặc cho phép tiếp tục
      // alert('Không kiểm tra được trạng thái ứng tuyển');
    }
    // Chưa ứng tuyển, mở form
    setSelectedRecruitmentId(recruitmentId);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Banner Skeleton */}
        <Skeleton className="h-64 md:h-80 w-full rounded-none" />

        {/* Club Header Skeleton */}
        <div className="relative -mt-20 px-4 md:px-8 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              {/* Logo Skeleton */}
              <Skeleton className="h-32 w-32 rounded-full border-4 border-background" />

              {/* Club Info Skeleton */}
              <div className="flex-1 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-96" />
                </div>

                {/* Stats Skeleton */}
                <div className="flex flex-wrap gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="px-4 md:px-8 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Tabs Skeleton */}
            <div className="flex gap-2 border-b">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-28" />
              ))}
            </div>

            {/* Content Cards Skeleton */}
            <div className="space-y-6">
              {/* Description Card */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />

                  {/* President Info Skeleton */}
                  <div className="mt-6 p-4 border rounded-lg">
                    <Skeleton className="h-3 w-32 mb-3" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                      >
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <p className="text-red-500 mb-4">
              {error || "Không tìm thấy câu lạc bộ"}
            </p>
            <Button onClick={() => window.history.back()}>Quay lại</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show application form if a recruitment is selected
  if (selectedRecruitmentId) {
    return (
      <ClubApplicationForm
        recruitmentId={selectedRecruitmentId}
        onBack={() => setSelectedRecruitmentId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
        <img
          src={club.bannerUrl || "/placeholder.svg"}
          alt={club.clubName}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Club Header */}
      <div className="relative -mt-20 px-4 md:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            {/* Logo */}
            <div className="relative z-10">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={club.logoUrl || "/placeholder.svg"} />
                <AvatarFallback>{club.clubName[0]}</AvatarFallback>
              </Avatar>
            </div>

            {/* Club Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                      {club.clubName}
                    </h1>
                    <Badge variant="secondary">{club.categoryName}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {club.description}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thành viên</p>
                    <p className="font-semibold text-lg">
                      {formatNumber(club.totalMembers)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sự kiện</p>
                    <p className="font-semibold text-lg">
                      {formatNumber(club.totalEvents)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tin tức</p>
                    <p className="font-semibold text-lg">
                      {formatNumber(club.totalPosts)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 items-center">
                {club.isRecruiting && (
                  <div className="ml-auto md:ml-2">
                    <Badge className="relative bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg">
                      <Zap className="h-3 w-3 mr-1 animate-bounce" />
                      Đang tuyển
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="events">Sự kiện</TabsTrigger>
              <TabsTrigger value="news">Tin tức</TabsTrigger>
              <TabsTrigger value="recruitment" className="relative">
                Tuyển thành viên
                {club.isRecruiting && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Club Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Giới thiệu câu lạc bộ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground leading-relaxed">
                    {club.description}
                  </p>

                  {/* President Info */}
                  {club.president && (
                    <div className="mt-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
                      <p className="text-sm text-muted-foreground mb-3">
                        Chủ tịch câu lạc bộ
                      </p>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={club.president.avatarUrl || "/placeholder.svg"}
                          />
                          <AvatarFallback>
                            {club.president.fullName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {club.president.fullName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {club.president.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Thông tin liên hệ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {club.fbUrl && (
                      <a
                        href={club.fbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Facebook</p>
                          <p className="text-xs text-muted-foreground">
                            Theo dõi trên Facebook
                          </p>
                        </div>
                      </a>
                    )}

                    {club.igUrl && (
                      <a
                        href={club.igUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="h-10 w-10 bg-pink-100 rounded-lg flex items-center justify-center">
                          <Globe className="h-5 w-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Instagram</p>
                          <p className="text-xs text-muted-foreground">
                            Theo dõi trên Instagram
                          </p>
                        </div>
                      </a>
                    )}

                    {club.email && (
                      <a
                        href={`mailto:${club.email}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <Mail className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-xs text-muted-foreground">
                            {club.email}
                          </p>
                        </div>
                      </a>
                    )}

                    {club.phone && (
                      <a
                        href={`tel:${club.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Phone className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Điện thoại</p>
                          <p className="text-xs text-muted-foreground">
                            {club.phone}
                          </p>
                        </div>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Sự kiện của câu lạc bộ</h2>
                <Badge variant="secondary">
                  Tổng: {formatNumber(club.totalEvents)} sự kiện
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <Card
                    key={event.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative h-40 bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden">
                      <img
                        src={event.image || "/placeholder.svg"}
                        alt={event.title}
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{event.attendees} người tham gia</span>
                        </div>
                      </div>

                      {/* <Button className="w-full">Tham gia sự kiện</Button> */}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Tin tức của câu lạc bộ</h2>
                <Badge variant="secondary">
                  Tổng: {formatNumber(club.totalPosts)} tin tức
                </Badge>
              </div>

              <div className="space-y-4">
                {news.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="relative h-40 md:h-auto md:w-48 bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-80"
                        />
                      </div>
                      <CardContent className="flex-1 pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg line-clamp-2 flex-1">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.content}
                        </p>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span>{item.date}</span>
                            <span>Bởi {item.author}</span>
                          </div>
                          {/* <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{item.views}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              <span>{item.likes}</span>
                            </div>
                          </div> */}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Recruitment Tab */}
            <TabsContent value="recruitment" className="space-y-6">
              {/* Loading state for recruitments */}
              {loadingRecruitments ? (
                <div className="space-y-6">
                  {/* Header Skeleton */}
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>

                  {/* Recruitment Cards Skeleton */}
                  <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <Card
                        key={index}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-5 rounded" />
                                <Skeleton className="h-6 w-64" />
                              </div>
                              <Skeleton className="h-4 w-96" />
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Requirements */}
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-5/6" />
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-accent/5">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="space-y-1">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-4 w-20" />
                              </div>
                            ))}
                          </div>

                          {/* Apply Button */}
                          <Skeleton className="h-10 w-full rounded" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">
                      Tuyển dụng thành viên
                    </h2>
                    <Badge variant="secondary">
                      {recruitments.length} đợt tuyển
                    </Badge>
                  </div>

                  {recruitments.length > 0 ? (
                    <div className="space-y-4">
                      {recruitments.map((recruitment) => (
                        <Card
                          key={recruitment.id}
                          id={`recruitment-${recruitment.id}`}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  <Award className="h-5 w-5 text-accent" />
                                  {recruitment.title}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {recruitment.description}
                                </CardDescription>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700"
                              >
                                {formatRecruitmentStatus(recruitment.status as unknown as string)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Requirements */}
                            {normalizeRequirements(recruitment.requirements as unknown as string | string[]).length > 0 && (
                              <div>
                                <p className="text-sm font-semibold mb-2">Yêu cầu:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                  {normalizeRequirements(recruitment.requirements as unknown as string | string[]).map((item, idx) => (
                                    <li key={idx} className="text-sm text-foreground">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 p-3 bg-accent/5 rounded-lg">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Bắt đầu
                                </p>
                                <p className="font-semibold text-sm">
                                  {formatDate(recruitment.startDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Hạn chót
                                </p>
                                <p className="font-semibold text-sm">
                                  {formatDate(recruitment.endDate)}
                                </p>
                              </div>
                            </div>

                            <Button
                              className="w-full"
                              onClick={() => handleApplyClick(recruitment.id)}
                            >
                              Ứng tuyển ngay
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Hiện tại câu lạc bộ không có đợt tuyển dụng nào
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Membership Warning Dialog */}
      <Dialog
        open={showMembershipWarning}
        onOpenChange={setShowMembershipWarning}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Không thể ứng tuyển
            </DialogTitle>
            <DialogDescription className="pt-4">
              <div className="space-y-3">
                <p className="text-foreground">
                  Bạn đã là thành viên của{" "}
                  <span className="font-semibold">{club?.clubName}</span> và
                  không thể ứng tuyển lại.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    💡 <span className="font-medium">Gợi ý:</span> Nếu bạn muốn
                    tham gia vào phòng ban khác hoặc thay đổi vai trò, vui lòng
                    liên hệ với ban quản lý câu lạc bộ.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowMembershipWarning(false)}
              className="w-full sm:w-auto"
            >
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Prompt Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yêu cầu đăng nhập</DialogTitle>
            <DialogDescription>
              Bạn cần đăng nhập để ứng tuyển vào đợt tuyển thành viên này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLoginPrompt(false)}>
              Để sau
            </Button>
            <Button onClick={() => navigate("/login")}>Đăng nhập</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog show when user already applied for this recruitment round */}
      <Dialog open={showAlreadyAppliedDialog} onOpenChange={setShowAlreadyAppliedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" /> Đã nộp đơn ứng tuyển
            </DialogTitle>
            <DialogDescription className="pt-4">
              <div className="space-y-3">
                <p className="text-foreground">
                  {alreadyAppliedMessage || 'Bạn đã nộp đơn ứng tuyển cho đợt này. Không thể nộp lại.'}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Vui lòng đợi kết quả xét tuyển trước khi nộp lại hoặc liên hệ ban quản lý câu lạc bộ nếu cần hỗ trợ.
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
    </div>
  );
}
