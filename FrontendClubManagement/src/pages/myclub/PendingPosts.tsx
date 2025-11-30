import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  postService,
  type PostWithRelationsData,
} from "@/services/postService";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useTeams } from "@/hooks/useTeams";
import { useClubPermissions } from "@/hooks/useClubPermissions";

export default function PendingPosts() {
  const { clubId } = useParams<{ clubId: string }>();
  const numericClubId = clubId ? Number(clubId) : undefined;
  const { isClubOfficer, isTeamOfficer, isClubTreasurer } =
    useClubPermissions(numericClubId);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isTabInitialized, setIsTabInitialized] = useState(false);
  const [posts, setPosts] = useState<PostWithRelationsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] =
    useState<PostWithRelationsData | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load teams
  const { data: teams, loading: teamsLoading } = useTeams(numericClubId);

  // Filter teams based on role
  // CLUB_OFFICER sees all teams, others only see teams where they are officers
  const visibleTeams = useMemo(() => {
    if (!teams) return [];

    // Club officer sees all teams
    if (isClubOfficer) return teams;

    // Team officer/treasurer only sees teams where they have roles (myRoles.length > 0)
    // This means they are officers of those teams
    return teams.filter((team) => team.myRoles && team.myRoles.length > 0);
  }, [teams, isClubOfficer]);

  // Set initial tab based on role - chỉ chạy 1 lần
  useEffect(() => {
    if (isTabInitialized || teamsLoading) return;

    if (isClubOfficer) {
      setActiveTab("club-wide");
      setIsTabInitialized(true);
    } else if (
      (isTeamOfficer || isClubTreasurer) &&
      visibleTeams.length > 0
    ) {
      // Team officer or treasurer starts with their first team
      setActiveTab(String(visibleTeams[0].teamId));
      setIsTabInitialized(true);
    } else if (!isClubOfficer && !isTeamOfficer && !isClubTreasurer) {
      setActiveTab("club-wide");
      setIsTabInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsLoading, visibleTeams]);

  // Load pending posts based on active tab
  const loadPendingPosts = useCallback(
    async (pageNum: number = 0) => {
      if (!clubId || !activeTab) return;

      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        let response;

        if (activeTab === "club-wide") {
          response = await postService.getPendingClubWidePosts(Number(clubId), {
            page: pageNum,
            size: 5,
            sort: "createdAt,desc",
          });
        } else {
          // Load team posts
          const teamId = Number(activeTab);
          if (isNaN(teamId)) {
            console.error("Invalid teamId:", activeTab);
            return;
          }
          response = await postService.getPendingTeamPosts(
            Number(clubId),
            teamId,
            {
              page: pageNum,
              size: 5,
              sort: "createdAt,desc",
            }
          );
        }

        if (response.code === 200 && response.data) {
          const { content, last, totalElements: total } = response.data;

          if (pageNum === 0) {
            setPosts(content);
          } else {
            setPosts((prev) => [...prev, ...content]);
          }

          setHasMore(!last);
          setTotalElements(total);
          setPage(pageNum);
        } else {
          toast.error("Không thể tải danh sách bài viết");
        }
      } catch (error) {
        console.error("Failed to load pending posts:", error);
        toast.error("Không thể tải danh sách bài viết");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [clubId, activeTab]
  );

  // Reload when tab changes - chỉ phụ thuộc activeTab
  useEffect(() => {
    if (!activeTab) return;
    
    setPosts([]);
    setPage(0);
    setHasMore(true);
    setTotalElements(0);
    loadPendingPosts(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadPendingPosts(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, page, loadPendingPosts]);

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return dateString;
    }
  };

  // Open approve dialog
  const openApproveDialog = (post: PostWithRelationsData) => {
    setSelectedPost(post);
    setApproveDialogOpen(true);
  };

  // Handle approve post
  const handleApprove = async () => {
    if (!selectedPost) return;

    setActionLoading(true);
    try {
      const response = await postService.approvePost(selectedPost.id);
      if (response.code === 200) {
        toast.success("Đã phê duyệt bài viết");
        setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
        // Update total count
        setTotalElements((prev) => Math.max(0, prev - 1));
        setApproveDialogOpen(false);
        setSelectedPost(null);
      } else {
        toast.error(response.message || "Không thể phê duyệt bài viết");
      }
    } catch (error) {
      console.error("Failed to approve post:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Không thể phê duyệt bài viết";
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // Open reject dialog
  const openRejectDialog = (post: PostWithRelationsData) => {
    setSelectedPost(post);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  // Handle reject post
  const handleReject = async () => {
    if (!selectedPost) return;

    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setActionLoading(true);
    try {
      const response = await postService.rejectPost(
        selectedPost.id,
        rejectReason
      );
      if (response.code === 200) {
        toast.success("Đã từ chối bài viết");
        setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
        // Update total count
        setTotalElements((prev) => Math.max(0, prev - 1));
        setRejectDialogOpen(false);
        setSelectedPost(null);
        setRejectReason("");
      } else {
        toast.error(response.message || "Không thể từ chối bài viết");
      }
    } catch (error) {
      console.error("Failed to reject post:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Không thể từ chối bài viết";
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to render image grid (like PostCard)
  const getGridLayout = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2";
    return "grid-cols-2";
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Bài viết chờ duyệt
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Xem xét và phê duyệt các bài viết từ thành viên
            </p>
          </div>
          <Badge
            variant="secondary"
            className="text-base sm:text-lg px-4 py-2 w-fit"
          >
            <Clock className="h-4 w-4 mr-2" />
            {totalElements} bài viết
          </Badge>
        </div>

        {/* Tabs - Horizontal Scroll */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative w-full">
            <div
              className="w-full overflow-x-auto overflow-y-hidden pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              style={{
                scrollbarWidth: "thin",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <TabsList className="inline-flex w-auto h-auto p-1 gap-1">
                {/* Club officer can see club-wide tab */}
                {isClubOfficer && (
                  <TabsTrigger
                    value="club-wide"
                    className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 flex-shrink-0"
                  >
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                    Toàn bộ câu lạc bộ
                  </TabsTrigger>
                )}
                {teamsLoading
                  ? // Loading skeletons for teams
                    [...Array(3)].map((_, idx) => (
                      <div
                        key={`skeleton-${idx}`}
                        className="flex items-center px-3 sm:px-4 h-9"
                      >
                        <Skeleton className="h-4 w-16 sm:w-20" />
                      </div>
                    ))
                  : visibleTeams &&
                    visibleTeams.length > 0 &&
                    visibleTeams.map((team) => (
                      <TabsTrigger
                        key={team.teamId}
                        value={String(team.teamId)}
                        className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 flex-shrink-0"
                      >
                        {team.teamName}
                      </TabsTrigger>
                    ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {/* Loading State */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, idx) => (
                  <Card key={idx} className="border-border shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <div className="flex gap-3">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              // Empty State
              <Card className="border-border shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Không có bài viết chờ duyệt
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Tất cả bài viết đã được xử lý
                  </p>
                </CardContent>
              </Card>
            ) : (
              // Posts List
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="border-border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                            <AvatarFallback>
                              {post.authorName?.[0]?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base font-semibold">
                              {post.authorName}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(post.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Chờ duyệt
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 p-0">
                      {/* Content */}
                      <div className="px-5 pt-3">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                          {post.content}
                        </p>
                      </div>

                      {/* Images Grid - PostCard style */}
                      {post.media && post.media.length > 0 && (
                        <div
                          className={`grid ${getGridLayout(
                            post.media.length
                          )} gap-0.5`}
                        >
                          {post.media.slice(0, 4).map((mediaItem, idx) => (
                            <div
                              key={mediaItem.id || idx}
                              className="relative aspect-square cursor-pointer overflow-hidden group bg-muted"
                            >
                              <img
                                src={mediaItem.mediaUrl}
                                alt={`Post image ${idx + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                  <div class="w-full h-full bg-muted/40 flex items-center justify-center text-muted-foreground">
                                    <div class="flex flex-col items-center gap-1">
                                      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span class="text-xs">Ảnh không khả dụng</span>
                                    </div>
                                  </div>
                                `;
                                  }
                                }}
                              />
                              {idx === 3 &&
                                post.media &&
                                post.media.length > 4 && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white text-2xl sm:text-3xl font-semibold">
                                      +{post.media.length - 4}
                                    </span>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 px-5 pb-5 pt-3">
                        <Button
                          className="flex-1 gap-2"
                          size="lg"
                          onClick={() => openApproveDialog(post)}
                          disabled={actionLoading}
                        >
                          <Check className="h-4 w-4" />
                          Phê duyệt
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          size="lg"
                          onClick={() => openRejectDialog(post)}
                          disabled={actionLoading}
                        >
                          <X className="h-4 w-4" />
                          Từ chối
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">
                      Đang tải thêm...
                    </span>
                  </div>
                )}

                {/* Infinite Scroll Sentinel */}
                <div ref={observerTarget} className="h-4" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Approve Confirmation Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Xác nhận phê duyệt
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn phê duyệt bài viết này? Bài viết sẽ được
                công khai cho thành viên.
              </DialogDescription>
            </DialogHeader>
            {selectedPost && (
              <div className="py-4">
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {selectedPost.authorName?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {selectedPost.authorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(selectedPost.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">
                    {selectedPost.content}
                  </p>
                  {selectedPost.media && selectedPost.media.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      📎 {selectedPost.media.length} tệp đính kèm
                    </p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setApproveDialogOpen(false);
                  setSelectedPost(null);
                }}
                disabled={actionLoading}
              >
                Hủy
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Xác nhận phê duyệt
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Từ chối bài viết
              </DialogTitle>
              <DialogDescription>
                Vui lòng nhập lý do từ chối để gửi phản hồi cho tác giả
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejectReason">
                  Lý do từ chối <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="VD: Nội dung không phù hợp với định hướng CLB, cần chỉnh sửa lại..."
                  rows={4}
                  className={!rejectReason.trim() ? "border-destructive" : ""}
                />
                {!rejectReason.trim() && (
                  <p className="text-sm text-destructive">
                    Vui lòng nhập lý do để tác giả biết cách cải thiện bài viết
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setSelectedPost(null);
                  setRejectReason("");
                }}
                disabled={actionLoading}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? "Đang xử lý..." : "Xác nhận từ chối"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
