import { useState, useEffect } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
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
  Mail,
  Phone,
  Globe,
  Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import clubService, {
  getClubDetailById,
  type ClubDetailData,
  type TeamDTO,
} from "@/services/clubService";
import {
  type RecruitmentData,
  getOpenRecruitmentsByClubId,
  checkApplicationStatus,
} from "@/services/recruitmentService";
import {
  getPublishedEventsByClubId,
  type EventData,
} from "@/service/EventService";
import {
  getPublishedNewsByClubId,
  type NewsData as NewsDataService,
} from "@/service/NewsService";
import { ClubApplicationForm } from "./ClubApplication";
import { getMyClubs } from "@/api/clubs";
import type { MyClubDTO } from "@/types/dto/MyClubDTO";
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
  const [, setLoadingRecruitments] = useState(false);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
  const eventsPerPage = 3;
  const [totalEventsPages, setTotalEventsPages] = useState(0);
  const [news, setNews] = useState<News[]>([]);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsCurrentPage, setNewsCurrentPage] = useState(1);
  const newsPerPage = 3;
  const [totalNewsPages, setTotalNewsPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecruitmentId, setSelectedRecruitmentId] = useState<
    number | null
  >(null);
  const [showMembershipWarning, setShowMembershipWarning] = useState(false);
  const [showAlreadyAppliedDialog, setShowAlreadyAppliedDialog] =
    useState(false);
  const [alreadyAppliedMessage, setAlreadyAppliedMessage] = useState<
    string | null
  >(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // NOTE: load user's clubs lazily when applying. Do not call hook on mount.

  // Fetch recruitments function
  const fetchRecruitments = async () => {
    if (recruitmentsLoaded || !clubId) return;

    try {
      setLoadingRecruitments(true);
      const recruitmentsResponse = await getOpenRecruitmentsByClubId(
        Number(clubId),
        { status: "OPEN", page: 1, size: 10 }
      );
      setRecruitments(recruitmentsResponse.content);
      setRecruitmentsLoaded(true);
    } catch (err) {
      console.error("Error fetching recruitments:", err);
    } finally {
      setLoadingRecruitments(false);
    }
  };

  // Fetch club data and recruitments in parallel
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

        // Fetch club data and recruitments in parallel
        await Promise.all([
          getClubDetailById(Number(clubId)).then((clubData) => {
            setClub(clubData);
            // Note: clubData.isRecruiting is already set by Backend
          }),
          fetchRecruitments(), // Fetch recruitments early, don't wait for isRecruiting
        ]);
      } catch (err) {
        console.error("Error fetching club data:", err);
        setError("Không thể tải thông tin câu lạc bộ");
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Fetch teams when teams tab is activated
  const fetchTeams = async () => {
    if (teamsLoaded || !clubId) return;

    try {
      setLoadingTeams(true);
      const teamsData = await clubService.getTeamsInClubDetail(Number(clubId));
      setTeams(teamsData.data || []);
      setTeamsLoaded(true);
    } catch (err) {
      console.error("Error fetching teams:", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Fetch events when events tab is activated or page changes
  const fetchEvents = async (page: number = eventsCurrentPage) => {
    if (!clubId) return;

    try {
      setLoadingEvents(true);
      // Sử dụng API published events với phân trang từ backend
      const eventsResponse = await getPublishedEventsByClubId(
        Number(clubId),
        undefined, // keyword
        page - 1, // page (API sử dụng 0-indexed)
        eventsPerPage, // size
        "startTime,desc" // sort
      );

      // Map EventData to Event interface
      const mappedEvents: Event[] = eventsResponse.content.map(
        (eventData: EventData) => {
          const startDate = new Date(eventData.startTime);
          const endDate = new Date(eventData.endTime);

          // Format date as DD/MM/YYYY
          const dateStr = startDate.toLocaleDateString("vi-VN");

          // Format time as HH:mm - HH:mm
          const startTimeStr = startDate.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const endTimeStr = endDate.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const timeStr = `${startTimeStr} - ${endTimeStr}`;

          return {
            id: eventData.id.toString(),
            title: eventData.title,
            date: dateStr,
            time: timeStr,
            location: eventData.location,
            description: eventData.description,
            attendees: 0, // API doesn't provide this, can be updated later
            image: eventData.mediaUrls?.[0] || "/placeholder.svg",
          };
        }
      );

      setEvents(mappedEvents);
      setTotalEventsPages(eventsResponse.totalPages);
      setEventsLoaded(true);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load teams when teams tab is activated
  useEffect(() => {
    if (activeTab === "teams") {
      fetchTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch news when news tab is activated or page changes
  const fetchNews = async (page: number = newsCurrentPage) => {
    if (!clubId) return;

    try {
      setLoadingNews(true);
      // Sử dụng API published news với phân trang từ backend
      const newsResponse = await getPublishedNewsByClubId(
        Number(clubId),
        undefined, // keyword
        page - 1, // page (API sử dụng 0-indexed)
        newsPerPage, // size
        "createdAt,desc" // sort
      );

      // Map NewsDataService to News interface
      const mappedNews: News[] = newsResponse.content.map(
        (newsData: NewsDataService) => {
          const updatedDate = new Date(newsData.updatedAt);

          // Format date as DD/MM/YYYY
          const dateStr = updatedDate.toLocaleDateString("vi-VN");

          return {
            id: newsData.id.toString(),
            title: newsData.title,
            content: newsData.content,
            date: dateStr,
            author: newsData.clubName || "Câu lạc bộ",
            image: newsData.thumbnailUrl || "/placeholder.svg",
            views: 0, // API doesn't provide this
            likes: 0, // API doesn't provide this
          };
        }
      );

      setNews(mappedNews);
      setTotalNewsPages(newsResponse.totalPages);
      setNewsLoaded(true);
    } catch (err) {
      console.error("Error fetching news:", err);
    } finally {
      setLoadingNews(false);
    }
  };

  // Load events when events tab is activated
  useEffect(() => {
    if (activeTab === "events") {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch events when page changes
  useEffect(() => {
    if (activeTab === "events" && eventsLoaded) {
      fetchEvents(eventsCurrentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsCurrentPage]);

  // Load news when news tab is activated
  useEffect(() => {
    if (activeTab === "news") {
      fetchNews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch news when page changes
  useEffect(() => {
    if (activeTab === "news" && newsLoaded) {
      fetchNews(newsCurrentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsCurrentPage]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "teams") {
      setActiveTab("teams");
    } else if (tab === "events") {
      setActiveTab("events");
    } else if (tab === "news") {
      setActiveTab("news");
    }
  }, [searchParams]);

  // Handle recruitmentId from URL query parameter
  useEffect(() => {
    const recruitmentIdParam = searchParams.get("recruitmentId");
    if (recruitmentIdParam) {
      const recruitmentId = parseInt(recruitmentIdParam, 10);
      if (!isNaN(recruitmentId)) {
        setSelectedRecruitmentId(recruitmentId);
      }
    }
  }, [searchParams]);

  // Format date helper
  // Accept backend LocalDateTime strings like "YYYY-MM-DDTHH:mm[:ss]" (no TZ)
  // and display as "DD/MM/YYYY HH:mm". Falls back to locale formatting.
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";

    try {
      // If string contains a 'T', treat as LocalDateTime from backend
      if (dateString.includes("T")) {
        // Keep up to minutes (YYYY-MM-DDTHH:mm)
        const trimmed = dateString.slice(0, 16);
        const [datePart, timePart] = trimmed.split("T");
        if (datePart && timePart) {
          const [year, month, day] = datePart.split("-");
          const hhmm = timePart.slice(0, 5); // HH:mm
          return `${day}/${month}/${year} ${hhmm}`;
        }
      }

      // Fallback: use Date and locale formatting
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        const dateStr = d.toLocaleDateString("vi-VN");
        const timeStr = d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${dateStr} ${timeStr}`;
      }
    } catch (e) {
      console.error("formatDate error", e);
    }

    return dateString;
  };

  // Format number helper (add comma separator)
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("vi-VN");
  };

  // Ensure URL is absolute (add https:// when missing) so anchors open external links
  const ensureAbsoluteUrl = (url?: string) => {
    if (!url) return undefined;
    const trimmed = url.trim();
    // Allow mailto and tel to pass through
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:")
    ) {
      return trimmed;
    }
    // Protocol-relative (//example.com)
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    // Otherwise assume it's a host or path from DB, prepend https://
    return `https://${trimmed}`;
  };

  // Check if user is already a member of this club. Accept clubs array so
  // we can load clubs lazily instead of calling a hook on mount.
  const isAlreadyMember = (clubs?: MyClubDTO[] | null) => {
    if (!clubs || !clubId) return false;
    return clubs.some((myClub) => myClub.clubId === Number(clubId));
  };

  // Handle recruitment application click
  const handleApplyClick = async (recruitmentId: number) => {
    // Prompt login if not authenticated
    if (!authService.isAuthenticated()) {
      setShowLoginPrompt(true);
      return;
    }
    // Check if user is already a member — load user's clubs lazily here
    let clubs: MyClubDTO[] | null = null;
    try {
      clubs = await getMyClubs();
    } catch (e) {
      console.error("Error fetching user's clubs:", e);
      // If we cannot determine membership, allow application flow to continue
      clubs = null;
    }

    if (isAlreadyMember(clubs)) {
      setShowMembershipWarning(true);
      return;
    }

    // Kiểm tra đã nộp đơn chưa bằng API mới
    try {
      const appStatus = await checkApplicationStatus(recruitmentId);
      if (appStatus.hasApplied) {
        setAlreadyAppliedMessage(
          "Bạn đã nộp đơn ứng tuyển cho đợt này. Không thể nộp lại."
        );
        setShowAlreadyAppliedDialog(true);
        return;
      }
    } catch (e) {
      console.error("Error checking application status:", e);
      // Nếu API lỗi, cho phép tiếp tục (hoặc có thể hiển thị cảnh báo)
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
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
        <img
          src={club.bannerUrl || "/placeholder.svg"}
          alt={club.clubName}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/30" />
        {/* avatar will be positioned relative to the content container below (so it's not clipped) */}
      </div>

      {/* Club Header */}
      <div className="relative mt-6 px-4 md:px-8 pb-8">
        <div className="max-w-6xl mx-auto relative">
          {/* Avatar positioned to overlap banner: centered on mobile, left-aligned on md+ */}
          <div className="absolute -top-20 md:-top-20 left-1/2 md:left-0 transform -translate-x-1/2 md:translate-x-0 z-20">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
              <AvatarImage src={club.logoUrl || "/placeholder.svg"} />
              <AvatarFallback>{club.clubName[0]}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end md:pl-48 pt-20 md:pt-0">
            {/* Logo (moved into banner for overlap) */}
            <div className="hidden" />

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
                      {formatNumber(club.totalNews)}
                    </p>
                  </div>
                </div>
                {/* Recruitment Info with Animation */}
                {club.isRecruiting && recruitments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge className="relative bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg h-auto py-2 px-3">
                      <Zap className="h-4 w-4 mr-1 animate-bounce" />
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
          {/* Recruitment Info Card */}
          {club.isRecruiting && recruitments.length > 0 && (
            <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
              {/* Recruitment Details - Compact */}
              <div className="space-y-2">
                {recruitments.slice(0, 2).map((recruitment) => (
                  <div
                    key={recruitment.id}
                    className="bg-white/80 rounded-md p-3 border border-red-100 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate mb-1">
                        {recruitment.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>
                            Thời hạn: {formatDate(recruitment.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApplyClick(recruitment.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 h-auto flex-shrink-0"
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Ứng tuyển
                    </Button>
                  </div>
                ))}
                {recruitments.length > 2 && (
                  <p className="text-sm text-center text-muted-foreground pt-1">
                    +{recruitments.length - 2} đợt tuyển khác
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-8 pt-4 pb-8">
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
              <TabsTrigger value="teams">Phòng ban</TabsTrigger>
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

                  {/* President / Club leaders Info: support single object or array from backend */}
                  {(club as any).presidents || club.president
                    ? (() => {
                        const raw = (club as any).presidents ?? club.president;
                        const leaders = Array.isArray(raw) ? raw : [raw];

                        return (
                          <div className="mt-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
                            <p className="text-sm text-muted-foreground mb-3">
                              {leaders.length > 1
                                ? "Ban chủ nhiệm"
                                : "Chủ tịch câu lạc bộ"}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {leaders.map((leader, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-3 rounded-md border border-border bg-white/50"
                                >
                                  <Avatar>
                                    <AvatarImage
                                      src={
                                        leader?.avatarUrl || "/placeholder.svg"
                                      }
                                    />
                                    <AvatarFallback>
                                      {leader?.fullName
                                        ? leader.fullName[0]
                                        : "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="truncate">
                                    <p className="font-semibold truncate">
                                      {leader?.fullName || "Không rõ tên"}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {leader?.email || "Không có email"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    : null}
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
                        href={ensureAbsoluteUrl(club.fbUrl)}
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
                        href={ensureAbsoluteUrl(club.igUrl)}
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

                    {club.ttUrl && (
                      <a
                        href={ensureAbsoluteUrl(club.ttUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="h-10 w-10 bg-black/5 rounded-lg flex items-center justify-center">
                          <Globe className="h-5 w-5 text-black" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">TikTok</p>
                          <p className="text-xs text-muted-foreground">
                            Xem trên TikTok
                          </p>
                        </div>
                      </a>
                    )}

                    {club.ytUrl && (
                      <a
                        href={ensureAbsoluteUrl(club.ytUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">YouTube</p>
                          <p className="text-xs text-muted-foreground">
                            Xem trên YouTube
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
                  Tổng: {formatNumber(events.length)} sự kiện
                </Badge>
              </div>

              {/* Loading state */}
              {loadingEvents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                      <Skeleton className="h-40 w-full" />
                      <CardContent className="pt-4 space-y-3">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : events.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event) => (
                      <Card
                        key={event.id}
                        className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                      >
                        <div className="relative h-40 bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden">
                          <img
                            src={event.image || "/placeholder.svg"}
                            alt={event.title}
                            className="w-full h-full object-cover opacity-80"
                          />
                        </div>
                        <CardContent className="pt-4 flex flex-col flex-1">
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
                              <span className="line-clamp-1">
                                {event.location}
                              </span>
                            </div>
                          </div>

                          <div className="mt-auto">
                            <Link to={`/events/${event.id}`}>
                              <Button className="w-full" variant="outline">
                                <Eye className="h-4 w-4 mr-2" />
                                Xem chi tiết
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalEventsPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setEventsCurrentPage((prev) =>
                                Math.max(1, prev - 1)
                              )
                            }
                            className={
                              eventsCurrentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        {[...Array(totalEventsPages)].map((_, index) => {
                          const page = index + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setEventsCurrentPage(page)}
                                isActive={eventsCurrentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setEventsCurrentPage((prev) =>
                                Math.min(totalEventsPages, prev + 1)
                              )
                            }
                            className={
                              eventsCurrentPage === totalEventsPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Câu lạc bộ chưa có sự kiện nào
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Tin tức của câu lạc bộ</h2>
                <Badge variant="secondary">
                  Tổng: {formatNumber(news.length)} tin tức
                </Badge>
              </div>

              {/* Loading state */}
              {loadingNews ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <Skeleton className="h-40 md:h-auto md:w-48 flex-shrink-0" />
                        <CardContent className="flex-1 pt-4 space-y-3">
                          <Skeleton className="h-6 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : news.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {news.map((item) => (
                      <Card
                        key={item.id}
                        className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                      >
                        <div className="flex flex-col md:flex-row flex-1">
                          <div className="relative h-40 md:h-auto md:w-48 bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0">
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.title}
                              className="w-full h-full object-cover opacity-80"
                            />
                          </div>
                          <CardContent className="flex-1 pt-4 flex flex-col">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-lg line-clamp-2 flex-1">
                                {item.title}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {item.content}
                            </p>

                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                              <div className="flex items-center gap-4">
                                <span>{item.date}</span>
                                <span>Bởi {item.author}</span>
                              </div>
                            </div>

                            <div className="mt-auto">
                              <Link to={`/news/${item.id}`}>
                                <Button className="w-full" variant="outline">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Xem chi tiết
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalNewsPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setNewsCurrentPage((prev) =>
                                Math.max(1, prev - 1)
                              )
                            }
                            className={
                              newsCurrentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        {[...Array(totalNewsPages)].map((_, index) => {
                          const page = index + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setNewsCurrentPage(page)}
                                isActive={newsCurrentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setNewsCurrentPage((prev) =>
                                Math.min(totalNewsPages, prev + 1)
                              )
                            }
                            className={
                              newsCurrentPage === totalNewsPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Câu lạc bộ chưa có tin tức nào
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-6">
              {/* Loading state for teams */}
              {loadingTeams ? (
                <div className="space-y-6">
                  {/* Header Skeleton */}
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>

                  {/* Team Cards Skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, index) => (
                      <Card
                        key={index}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-6 w-32" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-4 w-24" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Phòng ban</h2>
                    <Badge variant="secondary">{teams.length} phòng ban</Badge>
                  </div>

                  {teams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teams.map((team) => (
                        <Card
                          key={team.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Users className="h-5 w-5 text-blue-600" />
                              {team.teamName}
                            </CardTitle>
                            {team.description && (
                              <CardDescription className="mt-2 line-clamp-3">
                                {team.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Câu lạc bộ chưa có phòng ban nào
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
      <Dialog
        open={showAlreadyAppliedDialog}
        onOpenChange={setShowAlreadyAppliedDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" /> Đã nộp đơn ứng tuyển
            </DialogTitle>
            <DialogDescription className="pt-4">
              <div className="space-y-3">
                <p className="text-foreground">
                  {alreadyAppliedMessage ||
                    "Bạn đã nộp đơn ứng tuyển cho đợt này. Không thể nộp lại."}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Vui lòng đợi kết quả xét tuyển hoặc liên hệ ban quản lý câu
                    lạc bộ nếu cần hỗ trợ.
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
