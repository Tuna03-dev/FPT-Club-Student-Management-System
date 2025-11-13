import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTeamDetail } from "@/hooks/useTeamDetail";
import { useTeamLeadGuard } from "@/hooks/useTeamLeadGuard";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, Edit2, Plus, Search, Clock } from "lucide-react";
import { toast } from "sonner";

import TeamNewsDrafts from "@/pages/news/TeamNewsDrafts";
import TeamNewsRequests from "@/pages/news/TeamNewsRequests";
import { CreatePost } from "@/components/features/post/CreatePost";
import { PostCard } from "@/components/features/post/PostCard";
import {
  postService,
  type PostWithRelationsData,
} from "@/services/postService";

/* ===== helpers ===== */
type RoleTone = "leader" | "deputy" | "member" | "other";
type Tab = "posts" | "members" | "drafts" | "requests";

function roleToneFrom(roleName?: string): RoleTone {
  if (!roleName) return "other";
  const r = roleName.toLowerCase();
  if (r.includes("trưởng")) return "leader";
  if (r.includes("phó")) return "deputy";
  if (r.includes("thành viên") || r.includes("member")) return "member";
  return "other";
}
function roleBadgeClass(roleName?: string) {
  switch (roleToneFrom(roleName)) {
    case "leader":
      return "bg-primary text-primary-foreground";
    case "deputy":
      return "bg-accent text-accent-foreground";
    case "member":
      return "bg-secondary text-secondary-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
function rolePriority(roleName?: string) {
  const tone = roleToneFrom(roleName);
  if (tone === "leader") return 0;
  if (tone === "deputy") return 1;
  if (tone === "member") return 2;
  return 3;
}

function MemberListRow({
  fullName,
  roleName,
  email,
  studentCode,
  avatarUrl,
}: {
  fullName: string;
  roleName?: string;
  email?: string;
  studentCode?: string;
  avatarUrl?: string;
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl || ""} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {(fullName?.charAt(0) || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold truncate">{fullName}</h3>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass(
                roleName
              )}`}
            >
              {roleName ?? "—"}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            {email ? <span className="truncate">{email}</span> : null}
            {studentCode ? <span>MSSV: {studentCode}</span> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ================= Main Page ================= */
export default function TeamDetailPage() {
  const nav = useNavigate();
  const { clubId = "0", teamId = "0" } = useParams();
  const cId = Number(clubId);
  const tId = Number(teamId);

  // đọc & ghi tab từ URL
  const [sp, setSp] = useSearchParams();
  const tabInUrl = (sp.get("tab") as Tab) || "posts";
  const [activeTab, setActiveTab] = useState<Tab>(tabInUrl);

  const [search, setSearch] = useState("");

  const { data, loading, error } = useTeamDetail(cId, tId);
  const { allowed: isLead } = useTeamLeadGuard(cId, tId);

  // Check club-level permissions from localStorage
  const { isClubPresident } = useClubPermissions(cId);

  // Determine if user can view posts:
  // 1. CLUB_OFFICER can view all teams
  // 2. Team member can view their own team
  const memberFlag = !!data?.member;
  const canViewPosts = isClubPresident || memberFlag;

  // Posts state
  const [posts, setPosts] = useState<PostWithRelationsData[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const loadingRef = useRef(false);

  // Load team posts
  const loadPosts = useCallback(
    async (page: number, append: boolean = false) => {
      if (loadingRef.current) return;

      try {
        loadingRef.current = true;
        setPostsLoading(true);
        setPostsError(null);

        const response = await postService.getTeamPosts(cId, tId, {
          page: page,
          size: 10,
          sort: "createdAt,desc",
        });

        if (response.code === 200 && response.data) {
          const newPosts = response.data.content;
          setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
          setCurrentPage(page);
          setTotalPages(response.data.totalPages);
        } else {
          const message = response.message || "Không thể tải bài viết";
          setPostsError(message);
          toast.error(message);
        }
      } catch (err) {
        console.error("Error loading team posts:", err);
        const message = "Có lỗi khi tải bài viết";
        setPostsError(message);
        toast.error(message);
      } finally {
        setPostsLoading(false);
        loadingRef.current = false;
      }
    },
    [cId, tId]
  );

  // Load initial posts when tab is active and user can view posts
  useEffect(() => {
    if (activeTab === "posts" && canViewPosts && !loading) {
      loadPosts(0, false);
    }
  }, [activeTab, canViewPosts, loading, loadPosts]);

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    if (currentPage >= totalPages - 1) return;
    loadPosts(currentPage + 1, true);
  }, [currentPage, totalPages, loadPosts]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || activeTab !== "posts") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          currentPage < totalPages - 1 &&
          !loadingRef.current
        ) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, currentPage, totalPages, activeTab]);

  const refreshPosts = () => {
    setCurrentPage(0);
    setTotalPages(0);
    setPosts([]);
    loadPosts(0, false);
  };

  const convertPostToCard = (post: PostWithRelationsData) => {
    const imageMedia = (post.media || []).filter(
      (m) => m && m.mediaType === "IMAGE"
    );
    return {
      postId: post.id,
      clubId: cId,
      author: {
        id: post.authorId,
        name: post.authorName || "Người dùng",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
        role: "Thành viên",
      },
      content: post.content || "",
      images: imageMedia.map((m) => m.mediaUrl),
      imageIds: imageMedia.map((m) => m.id),
      timestamp: formatTimestamp(post.createdAt || new Date().toISOString()),
      likes: (post.likes || []).length,
      comments: (post.comments || []).length,
      shares: 0,
    };
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Vừa xong";
    if (diffInHours < 24) return `${diffInHours} giờ trước`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;

    return date.toLocaleDateString("vi-VN");
  };

  // Đồng bộ URL → state (khi back/forward hoặc điều hướng từ editor)
  useEffect(() => {
    const next = (sp.get("tab") as Tab) || "posts";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Đồng bộ state → URL (khi click tab)
  useEffect(() => {
    const cur = sp.get("tab");
    if (activeTab !== (cur as Tab)) {
      const next = new URLSearchParams(sp);
      next.set("tab", activeTab);
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Nếu không phải leader thì chặn tab drafts/requests
  useEffect(() => {
    if (
      isLead === false &&
      (activeTab === "drafts" || activeTab === "requests")
    ) {
      setActiveTab("posts");
    }
  }, [isLead, activeTab]);

  // Nếu không có quyền xem posts thì chặn tab posts → chuyển sang members
  useEffect(() => {
    if (!canViewPosts && activeTab === "posts") {
      setActiveTab("members");
    }
  }, [canViewPosts, activeTab]);

  // ❌ ĐỪNG return sớm trước các hooks khác
  // Thay vì return, hiển thị loading/error trong JSX bên dưới

  const teamName = data?.teamName ?? "";
  const teamDesc = data?.description ?? "";

  // Wrap rawMembers in useMemo to prevent dependency issues
  const rawMembers = useMemo(() => data?.members ?? [], [data?.members]);

  // Các useMemo luôn được gọi (kể cả loading/error) để giữ thứ tự hooks ổn định
  const members = useMemo(
    () =>
      rawMembers.map((m) => ({
        id: m.userId,
        name: m.fullName,
        roleName: m.roleName,
        email: m.email,
        studentCode: m.studentCode,
        avatarUrl: m.avatarUrl || "",
      })),
    [rawMembers]
  );

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.roleName ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.studentCode ?? "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const filteredMembersSorted = useMemo(() => {
    const arr = [...filteredMembers];
    arr.sort((a, b) => {
      const pa = rolePriority(a.roleName);
      const pb = rolePriority(b.roleName);
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, "vi");
    });
    return arr;
  }, [filteredMembers]);

  const hasMore = currentPage < totalPages - 1;

  return (
    <div className="min-h-screen bg-background">
      {/* LOADING / ERROR / PARAMS INVALID */}
      {!Number.isFinite(cId) || !Number.isFinite(tId) ? (
        <div className="p-6 text-sm text-muted-foreground">
          Tham số không hợp lệ.
        </div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : loading ? (
        <div className="p-6">Đang tải…</div>
      ) : (
        <>
          {/* HEADER */}
          <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-16 h-16 rounded-lg bg-white/20 grid place-items-center text-xl font-bold">
                    {(teamName || "T").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-1">
                      {teamName || "—"}
                    </h1>
                    <p className="text-sm opacity-90">{teamDesc || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isLead && (
                    <Button
                      className="bg-white text-primary hover:bg-white/90"
                      onClick={() =>
                        nav(`/myclub/${cId}/teams/${tId}/news-editor`)
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tạo news
                    </Button>
                  )}
                  {isLead && (
                    <Button className="bg-white/20 hover:bg-white/30 text-white">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Chỉnh sửa
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="border-b border-border bg-card sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-8">
                {[
                  // Posts: CLUB_OFFICER hoặc thành viên team
                  {
                    id: "posts",
                    label: "Bài đăng",
                    icon: FileText,
                    show: canViewPosts,
                  },
                  // Members luôn hiển thị để mọi thành viên CLB xem
                  {
                    id: "members",
                    label: "Thành viên",
                    icon: Users,
                    show: true,
                  },
                  // Drafts/Requests: chỉ leader
                  {
                    id: "drafts",
                    label: "Drafts",
                    icon: FileText,
                    show: !!isLead,
                  },
                  {
                    id: "requests",
                    label: "Requests",
                    icon: Clock,
                    show: !!isLead,
                  },
                ]
                  .filter((t) => t.show)
                  .map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === (tab.id as Tab);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                          active
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Access Denied Message for Posts */}
            {activeTab === "posts" && !canViewPosts && (
              <Card className="p-6 border-yellow-500/20 bg-yellow-500/5">
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="text-yellow-700 dark:text-yellow-400 font-semibold">
                      Bạn không có quyền xem bài đăng của phòng ban này
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chỉ thành viên của phòng ban hoặc Chủ nhiệm/Phó Chủ nhiệm
                      CLB mới có thể xem bài đăng.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("members")}
                    >
                      Xem danh sách thành viên
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "posts" && canViewPosts && (
              <div className="max-w-3xl mx-auto">
                {/* Create Post */}
                <div className="mb-4">
                  <CreatePost onPostCreated={refreshPosts} clubId={cId} />
                </div>

                {/* Loading State - First Load */}
                {postsLoading && posts.length === 0 && (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className="p-6">
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-32 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Error State */}
                {postsError && posts.length === 0 && (
                  <Card className="p-6 border-destructive/20">
                    <CardContent>
                      <div className="text-center space-y-4">
                        <div className="text-destructive font-semibold">
                          {postsError}
                        </div>
                        <button
                          onClick={refreshPosts}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Thử lại
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Posts Feed */}
                {posts.length > 0 && (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        {...convertPostToCard(post)}
                        onPostUpdated={refreshPosts}
                        onPostDeleted={refreshPosts}
                      />
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!postsLoading && posts.length === 0 && !postsError && (
                  <Card className="p-6">
                    <CardContent>
                      <div className="text-center space-y-4">
                        <div className="text-muted-foreground">
                          Chưa có bài viết nào
                        </div>
                        <button
                          onClick={refreshPosts}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Tải lại
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Infinite Scroll Sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="py-8 text-center">
                    {postsLoading && (
                      <div className="animate-pulse text-muted-foreground">
                        Đang tải thêm...
                      </div>
                    )}
                  </div>
                )}

                {/* No More Posts */}
                {!postsLoading && !hasMore && posts.length > 0 && (
                  <div className="flex justify-center py-4">
                    <div className="text-muted-foreground text-sm">
                      Đã hiển thị tất cả bài viết
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "members" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Danh sách thành viên</h2>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo tên, vai trò, email, MSSV…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredMembersSorted.map((m) => (
                    <MemberListRow
                      key={m.id}
                      fullName={m.name}
                      roleName={m.roleName}
                      email={m.email}
                      studentCode={m.studentCode}
                      avatarUrl={m.avatarUrl}
                    />
                  ))}
                  {!filteredMembersSorted.length && (
                    <Card className="p-6 text-sm text-muted-foreground">
                      Không tìm thấy thành viên phù hợp.
                    </Card>
                  )}
                </div>
              </div>
            )}

            {activeTab === "drafts" && <TeamNewsDrafts />}
            {activeTab === "requests" && <TeamNewsRequests />}
          </div>
        </>
      )}
    </div>
  );
}
