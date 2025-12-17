import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicClubs } from "@/api/publicClubs";
import type { ClubCard, PageResp } from "@/types/publicClub";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Sparkles, Search, AlertCircle } from "lucide-react";
import { authService } from "@/services/authService";
import { checkApplicationStatus } from "@/services/recruitmentService";
import { useMyClubs } from "@/hooks/useMyClubs";
import { ClubCardSkeleton } from "@/components/club/ClubCardSkeleton";

export default function ClubsPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResp<ClubCard> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [recruitmentFilter, setRecruitmentFilter] = useState<string>("all");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showMembershipWarning, setShowMembershipWarning] = useState(false);
  const [showAlreadyAppliedDialog, setShowAlreadyAppliedDialog] =
    useState(false);
  const [alreadyAppliedMessage, setAlreadyAppliedMessage] = useState<
    string | null
  >(null);
  const [selectedClubName, setSelectedClubName] = useState<string>("");

  const navigate = useNavigate();

  // ✅ Chỉ load danh sách CLB của tôi nếu đã đăng nhập
  const isAuthenticated = authService.isAuthenticated();
  const { data: myClubs } = useMyClubs(isAuthenticated);

  useEffect(() => {
    setLoading(true);
    const debounce = setTimeout(() => {
      getPublicClubs({
        q: searchQuery || undefined,
        page,
        size: 8,
      })
        .then(setData)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(debounce);
  }, [page, searchQuery]);

  // Reset về page 0 khi search hoặc filter đổi
  useEffect(() => {
    setPage(0);
  }, [searchQuery, recruitmentFilter]);

  // Filter clubs by recruitment status (client-side)
  const filteredClubs = useMemo(() => {
    if (!data) return [];

    let clubs = data.content;

    if (recruitmentFilter === "has") {
      clubs = clubs.filter(
        (club) => club.hasActiveRecruitment && club.activeRecruitmentId
      );
    } else if (recruitmentFilter === "none") {
      clubs = clubs.filter(
        (club) => !club.hasActiveRecruitment || !club.activeRecruitmentId
      );
    }

    return clubs;
  }, [data, recruitmentFilter]);

  // Check if user is already a member of a club
  const isAlreadyMember = (clubId: number) => {
    if (!myClubs) return false;
    return myClubs.some((myClub) => myClub.clubId === clubId);
  };

  const handleApplyClick = async (
    clubId: number,
    recruitmentId: number,
    clubName: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Prompt login if not authenticated
    if (!authService.isAuthenticated()) {
      setShowLoginPrompt(true);
      return;
    }

    // Check if user is already a member
    if (isAlreadyMember(clubId)) {
      setSelectedClubName(clubName);
      setShowMembershipWarning(true);
      return;
    }

    // Kiểm tra đã nộp đơn chưa
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
    }

    // Chưa ứng tuyển, điều hướng đến form
    navigate(`/club/${clubId}?recruitmentId=${recruitmentId}`);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">
              Câu Lạc Bộ
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Khám Phá Các Câu Lạc Bộ
            </h1>
            <p className="text-base md:text-lg text-muted-foreground text-pretty">
              Tìm kiếm và tham gia các câu lạc bộ phù hợp với đam mê của bạn
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-4 border-b border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 items-end justify-center">
              {/* Search Bar */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm câu lạc bộ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 bg-background"
                  />
                </div>
              </div>

              {/* Filter Dropdown */}
              <div className="w-full sm:w-auto sm:min-w-[250px]">
                <Select
                  value={recruitmentFilter}
                  onValueChange={setRecruitmentFilter}
                >
                  <SelectTrigger className="w-full bg-background h-12">
                    <SelectValue placeholder="Lọc theo đợt ứng tuyển" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả câu lạc bộ</SelectItem>
                    <SelectItem value="has">Có đợt ứng tuyển</SelectItem>
                    <SelectItem value="none">Không có đợt ứng tuyển</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-2 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 8 }, (_, i) => (
              <ClubCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          data && (
            <>
              {/* Clubs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {filteredClubs.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    Không tìm thấy câu lạc bộ nào phù hợp với bộ lọc của bạn.
                  </div>
                ) : (
                  filteredClubs.map((club) => {
                    const hasRecruitment =
                      club.hasActiveRecruitment && club.activeRecruitmentId;
                    return (
                      <div key={club.id} className="relative flex flex-col">
                        <Link
                          to={`/club/${club.id}`}
                          className="block flex-1 flex flex-col h-full"
                        >
                          <Card
                            className={`flex-1 flex flex-col hover:shadow-lg transition-all cursor-pointer ${
                              hasRecruitment ? "shadow-md hover:shadow-xl" : ""
                            }`}
                          >
                            {hasRecruitment && (
                              <div className="absolute top-2 right-2 z-10">
                                <Badge className="bg-primary text-primary-foreground animate-pulse flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Đang tuyển
                                </Badge>
                              </div>
                            )}
                            <div className="relative h-48 bg-muted overflow-hidden">
                              <img
                                src={
                                  club.bannerUrl ||
                                  club.logoUrl ||
                                  "/placeholder.svg"
                                }
                                alt={club.clubName}
                                className={`w-full h-full object-cover transition-transform ${
                                  hasRecruitment
                                    ? "hover:scale-110 brightness-110"
                                    : "hover:scale-105"
                                }`}
                              />
                            </div>
                            <CardHeader className="flex-shrink-0">
                              <CardTitle className="line-clamp-2 flex items-center gap-2">
                                {club.clubName}
                                {hasRecruitment && (
                                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                )}
                              </CardTitle>
                              <CardDescription className="line-clamp-2">
                                {club.shortDescription}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                              <div className="space-y-4 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="w-4 h-4" />
                                  <span>{club.totalTeams ?? 0} phòng ban</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {club.topTags.slice(0, 2).map((t) => (
                                    <Badge key={t} variant="secondary">
                                      {t}
                                    </Badge>
                                  ))}
                                  {club.tagsOverflow > 0 && (
                                    <Badge variant="outline">
                                      +{club.tagsOverflow}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2 mt-auto">
                                  {hasRecruitment && (
                                    <Button
                                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group"
                                      onClick={(e) =>
                                        handleApplyClick(
                                          club.id,
                                          club.activeRecruitmentId!,
                                          club.clubName,
                                          e
                                        )
                                      }
                                    >
                                      <span className="relative z-10 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                                        Điền đơn ứng tuyển
                                      </span>
                                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                                    </Button>
                                  )}
                                  <Button variant="default" className="w-full">
                                    Xem Chi Tiết
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {!loading && filteredClubs.length > 0 && data.totalPages > 1 && (
                <div className="flex items-center justify-center mt-12">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={data.first}
                    >
                      Trước
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, data.totalPages) },
                        (_, i) => {
                          const currentPageNum = data.number + 1;
                          let pageNum;
                          if (data.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPageNum <= 3) {
                            pageNum = i + 1;
                          } else if (currentPageNum >= data.totalPages - 2) {
                            pageNum = data.totalPages - 4 + i;
                          } else {
                            pageNum = currentPageNum - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPageNum === pageNum
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => setPage(pageNum - 1)}
                              className="w-10 h-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={data.last}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
        )}
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
                  <span className="font-semibold">{selectedClubName}</span> và
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
                    Vui lòng đợi kết quả xét tuyển liên hệ ban quản lý câu lạc
                    bộ nếu cần hỗ trợ.
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
    </main>
  );
}
