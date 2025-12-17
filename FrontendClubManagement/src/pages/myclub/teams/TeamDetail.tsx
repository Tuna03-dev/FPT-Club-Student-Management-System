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
import {
  FileText,
  Users,
  Edit2,
  Search,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import TeamNewsDrafts from "@/pages/news/TeamNewsDrafts";
import TeamNewsRequests from "@/pages/news/TeamNewsRequests";
import { CreatePost } from "@/components/post/CreatePost";
import { PostCard } from "@/components/post/PostCard";
import {
  postService,
  type PostWithRelationsData,
} from "@/services/postService";

import { updateTeam, deleteTeam } from "@/api/teams";
import type { UpdateTeamPayload } from "@/types/team";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  // 🧨 RESET toàn bộ state khi teamId đổi

  const nav = useNavigate();
  const { clubId = "0", teamId = "0" } = useParams();
  const cId = Number(clubId);
  const tId = Number(teamId);
  useEffect(() => {
    setLocalTeamInfo(null); // reset team info
    setPosts([]); // reset posts
    setSearch(""); // reset search
    setActiveTab("posts"); // reset tab
    setCurrentPage(0); // reset page
    setTotalPages(0); // reset total
  }, [tId]);
  // đọc & ghi tab từ URL
  const [sp, setSp] = useSearchParams();
  const tabInUrl = (sp.get("tab") as Tab) || "posts";
  const [activeTab, setActiveTab] = useState<Tab>(tabInUrl);

  const [search, setSearch] = useState("");

  const { data, loading, error } = useTeamDetail(cId, tId);
  const { allowed: isLead } = useTeamLeadGuard(cId, tId);

  // Check club-level permissions from localStorage
  const { isClubOfficer } = useClubPermissions(cId);

  // Determine if user can view posts:
  // 1. CLUB_OFFICER can view all teams
  // 2. Team member can view their own team
  const memberFlag = !!data?.member;
  const canViewPosts = isClubOfficer || memberFlag;

  // Local team info override (để update UI sau khi sửa)
  const [localTeamInfo, setLocalTeamInfo] = useState<{
    teamName: string;
    description: string;
    linkGroupChat?: string | null;
  } | null>(null);

  // useEffect(() => {
  //   if (data && !localTeamInfo) {
  //     setLocalTeamInfo({
  //       teamName: data.teamName ?? "",
  //       description: data.description ?? "",
  //       linkGroupChat: (data as any).linkGroupChat ?? null, // nếu DTO có
  //     });
  //   }
  // }, [data, localTeamInfo]);
  // 🔥 Luôn sync info khi đổi team
  useEffect(() => {
    if (data) {
      setLocalTeamInfo({
        teamName: data.teamName ?? "",
        description: data.description ?? "",
        linkGroupChat: data.linkGroupChat ?? null,
      });
    }
  }, [data, tId]);

  const teamName = localTeamInfo?.teamName ?? data?.teamName ?? "";
  const teamDesc = localTeamInfo?.description ?? data?.description ?? "";
  const teamLink =
    localTeamInfo?.linkGroupChat ?? (data as any)?.linkGroupChat ?? "";

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
          page,
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
          toast.error(message, { duration: 2500 });
        }
      } catch (err) {
        console.error("Error loading team posts:", err);
        const message = "Có lỗi khi tải bài viết";
        setPostsError(message);
        toast.error(message, { duration: 2500 });
      } finally {
        setPostsLoading(false);
        loadingRef.current = false;
      }
    },
    [cId, tId]
  );

  // Load initial posts when tab is active and user can view posts
  // useEffect(() => {
  //   if (activeTab === "posts" && canViewPosts && !loading) {
  //     loadPosts(0, false);
  //   }
  // }, [activeTab, canViewPosts, loading, loadPosts]);
  // 🔥 Load posts khi đổi phòng ban hoặc đổi tab
  useEffect(() => {
    if (activeTab === "posts" && canViewPosts && !loading) {
      setPosts([]);
      setCurrentPage(0);
      setTotalPages(0);
      loadPosts(0, false);
    }
  }, [tId, activeTab, canViewPosts, loading, loadPosts]);

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
        avatar: post.authorAvatarUrl,
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

  // wrap rawMembers
  const rawMembers = useMemo(() => data?.members ?? [], [data?.members]);

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

  /* ========= EDIT / DELETE STATE ========= */
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editErrors, setEditErrors] = useState<{
    name?: string;
    desc?: string;
    link?: string;
    general?: string;
  }>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Khi mở modal sửa, sync giá trị hiện tại
  useEffect(() => {
    if (editOpen) {
      setEditName(teamName || "");
      setEditDesc(teamDesc || "");
      setEditLink(teamLink || "");
      setEditErrors({});
    }
  }, [editOpen, teamName, teamDesc, teamLink]);

  // Validate "tên phòng ban có nghĩa" (client)
  function validateMeaningfulTeamNameClient(
    trimmedName: string
  ): string | undefined {
    if (trimmedName.length < 3) {
      return "Tên phòng ban phải có ít nhất 3 ký tự.";
    }

    const hasLetter = /[\p{L}]/u.test(trimmedName);
    if (!hasLetter) {
      return "Tên phòng ban phải chứa ít nhất một chữ cái.";
    }

    const allDigits = /^\d+$/.test(trimmedName);
    if (allDigits) {
      return "Tên phòng ban không được chỉ gồm chữ số.";
    }

    const compact = trimmedName.replace(/\s+/g, "");
    if (compact.length >= 3 && new Set(compact).size === 1) {
      return "Tên phòng ban không hợp lệ. Vui lòng nhập tên có nghĩa hơn.";
    }

    let specialCount = 0;
    for (const ch of trimmedName) {
      if (!/[0-9\p{L}\s]/u.test(ch)) {
        specialCount++;
      }
    }
    if (specialCount > 3) {
      return "Tên phòng ban có quá nhiều ký tự đặc biệt. Vui lòng đặt tên dễ đọc hơn.";
    }

    return undefined;
  }

  function validateEditForm() {
    const trimmedName = editName.trim();
    const trimmedDesc = editDesc.trim();
    const trimmedLink = editLink.trim();

    const nextErrors: typeof editErrors = {};

    if (!trimmedName) {
      nextErrors.name = "Vui lòng nhập tên phòng ban.";
    } else {
      const nameError = validateMeaningfulTeamNameClient(trimmedName);
      if (nameError) nextErrors.name = nameError;
    }

    if (!trimmedDesc) {
      nextErrors.desc = "Vui lòng nhập mô tả phòng ban.";
    } else if (trimmedDesc.length < 10) {
      nextErrors.desc = "Mô tả cần ít nhất 10 ký tự để mô tả rõ hơn.";
    }

    if (trimmedLink) {
      try {
        new URL(trimmedLink);
      } catch {
        nextErrors.link =
          "Link nhóm chat không hợp lệ. Vui lòng nhập dạng https://...";
      }
    }

    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSaveEdit() {
    if (!validateEditForm()) return;

    const payload: UpdateTeamPayload = {
      teamName: editName.trim(),
      description: editDesc.trim(),
      linkGroupChat: editLink.trim() || undefined,
    };

    try {
      setSavingEdit(true);
      const updated = await updateTeam(tId, payload);

      setLocalTeamInfo({
        teamName: updated.teamName,
        description: updated.description ?? "",
        linkGroupChat: updated.linkGroupChat ?? "",
      });

      setEditOpen(false);
      toast.success("Cập nhật phòng ban thành công.", { duration: 2500 });
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể cập nhật phòng ban. Vui lòng thử lại.";

      const code = err?.response?.data?.code ?? null;

      // 🔥 Nếu backend trả TEAM_NAME_EXISTED → hiển thị ngay dưới ô name
      if (code === 8001 || apiMsg.toLowerCase().includes("tên ban")) {
        setEditErrors((prev) => ({
          ...prev,
          name: apiMsg,
          general: undefined,
        }));
      } else {
        setEditErrors((prev) => ({ ...prev, general: apiMsg }));
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    try {
      setDeleting(true);
      await deleteTeam(tId);

      // 🔔 realtime local remove team page (khỏi cache React Query nếu dùng)
      try {
        window.dispatchEvent(
          new CustomEvent("team-deleted", {
            detail: { clubId: cId, teamId: tId },
          })
        );
      } catch (_) {}

      setDeleteOpen(false);
      toast.success("Đã xóa phòng ban khỏi CLB.", { duration: 2500 });

      // Điều hướng về danh sách team của CLB
      nav(`/myclub/${cId}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Không thể xóa phòng ban. Vui lòng thử lại.";
      toast.error(msg, { duration: 2500 });
    } finally {
      setDeleting(false);
    }
  }

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
                    <p className="text-sm opacity-90">
                      {teamDesc || "—"}
                      {teamLink ? (
                        <span className="block text-xs mt-1 opacity-80">
                          Link nhóm:{" "}
                          <a
                            href={teamLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-primary-foreground font-medium"
                          >
                            Mở nhóm chat
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isClubOfficer && (
                    <>
                      <Button
                        className="bg-white/20 hover:bg-white/30 text-white"
                        onClick={() => setEditOpen(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Sửa thông tin phòng ban
                      </Button>
                      <Button
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa phòng ban
                      </Button>
                    </>
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
                  {
                    id: "posts",
                    label: "Bài đăng",
                    icon: FileText,
                    show: canViewPosts,
                  },
                  {
                    id: "members",
                    label: "Thành viên",
                    icon: Users,
                    show: true,
                  },
                  // {
                  //   id: "drafts",
                  //   label: "Bản Nháp tin tức",
                  //   icon: FileText,
                  //   show: !!isLead,
                  // },
                  // {
                  //   id: "requests",
                  //   label: "Tin tức chờ duyệt",
                  //   icon: Clock,
                  //   show: !!isLead,
                  // },
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
                <div className="mb-4">
                  <CreatePost
                    onPostCreated={refreshPosts}
                    clubId={cId}
                    teamId={tId}
                  />
                </div>

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

                {hasMore && (
                  <div ref={sentinelRef} className="py-8 text-center">
                    {postsLoading && (
                      <div className="animate-pulse text-muted-foreground">
                        Đang tải thêm...
                      </div>
                    )}
                  </div>
                )}

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

          {/* ========== EDIT DIALOG ========== */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sửa thông tin phòng ban</DialogTitle>
                <DialogDescription>
                  Chỉ Chủ nhiệm/Phó chủ nhiệm CLB được phép chỉnh sửa thông tin
                  phòng ban. Các thay đổi sẽ được thông báo đến thành viên.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Tên phòng ban <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ví dụ: Ban Truyền thông"
                    className={editErrors.name ? "border-red-500" : ""}
                  />
                  {editErrors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Mô tả <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                      editErrors.desc ? "border-red-500" : ""
                    }`}
                    placeholder="Mô tả chức năng và trách nhiệm của phòng ban..."
                  />
                  {editErrors.desc && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.desc}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Link nhóm chat{" "}
                    <span className="text-xs text-muted-foreground">
                      (có thể để trống)
                    </span>
                  </label>
                  <Input
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    placeholder="https://zalo.me/..., https://chat.whatsapp.com/..."
                    className={editErrors.link ? "border-red-500" : ""}
                  />
                  {editErrors.link && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.link}
                    </p>
                  )}
                </div>

                {editErrors.general && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {editErrors.general}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={savingEdit}
                >
                  Hủy
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ========== DELETE CONFIRM DIALOG ========== */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bạn chắc chắn muốn xóa phòng ban này?</DialogTitle>
                <DialogDescription>
                  Phòng ban <strong>{teamName}</strong> sẽ bị xóa khỏi CLB. Tất
                  cả thành viên trong ban sẽ nhận được thông báo rằng phòng ban
                  đã bị xóa. Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? "Đang xóa..." : "Xóa phòng ban"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
