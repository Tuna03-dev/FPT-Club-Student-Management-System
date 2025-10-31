"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTeamDetail } from "@/hooks/useTeamDetail";
import { useTeamLeadGuard } from "@/hooks/useTeamLeadGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  Users,
  Edit2,
  Plus,
  Search,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Clock,
} from "lucide-react";

import TeamNewsDrafts from "@/pages/news/TeamNewsDrafts";
import TeamNewsRequests from "@/pages/news/TeamNewsRequests";

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
function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span>{children}</span>
    </div>
  );
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
            {fullName?.charAt(0) ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold truncate">{fullName}</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass(roleName)}`}>
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
function PostCard({
  author,
  content,
  image,
  timestamp,
  likes,
  comments,
  maxLength = 160,
}: {
  author: { name: string; avatar?: string; role?: string };
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
  maxLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const over = content.length > maxLength;
  const shown = over && !expanded ? content.slice(0, maxLength) + "..." : content;

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="flex items-start justify-between p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src={author.avatar || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 pl-2">
          <h3 className="font-semibold">{author.name}</h3>
          <p className="text-sm text-muted-foreground">
            {author.role ?? "Thành viên"} · {timestamp}
          </p>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap">{shown}</p>
        {over && (
          <Button
            variant="link"
            className="p-0 h-auto text-primary"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Ẩn bớt" : "Xem thêm"}
          </Button>
        )}
      </div>

      {image && <img src={image} alt="Post" className="w-full object-cover max-h-96" />}

      <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-top border-t">
        <span>{likes} lượt thích</span>
        <span>{comments} bình luận</span>
      </div>

      <div className="flex items-center border-t">
        <Button variant="ghost" className="flex-1 gap-2 rounded-none" size="sm">
          <Heart className="h-5 w-5" />
          <span className="hidden sm:inline">Thích</span>
        </Button>
        <Button variant="ghost" className="flex-1 gap-2 rounded-none border-x" size="sm">
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Bình luận</span>
        </Button>
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
  const { allowed: isLead, error: guardErr } = useTeamLeadGuard(cId, tId);

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
    if (isLead === false && (activeTab === "drafts" || activeTab === "requests")) {
      setActiveTab("posts");
    }
  }, [isLead, activeTab]);

  // ❌ ĐỪNG return sớm trước các hooks khác
  // Thay vì return, hiển thị loading/error trong JSX bên dưới

  const teamName = data?.teamName ?? "";
  const teamDesc = data?.description ?? "";
  const myRoles = data?.myRoles ?? [];
  const memberFlag = !!data?.member;
  const rawMembers = data?.members ?? [];
  const totalCount = (data?.memberCount ?? rawMembers.length) || 0;

  // Các useMemo luôn được gọi (kể cả loading/error) để giữ thứ tự hooks ổn định
  const members = useMemo(
    () =>
      rawMembers.map((m: any) => ({
        id: m.userId,
        name: m.fullName,
        roleName: m.roleName as string | undefined,
        email: m.email as string | undefined,
        studentCode: m.studentCode as string | undefined,
        avatarUrl: (m.avatarUrl as string | undefined) || "",
      })),
    [rawMembers]
  );

  const leader = useMemo(
    () => members.find((m) => roleToneFrom(m.roleName) === "leader"),
    [members]
  );
  const deputy = useMemo(
    () => members.find((m) => roleToneFrom(m.roleName) === "deputy"),
    [members]
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

  const mockPosts = [
    {
      author: {
        name: leader?.name || teamName || "Team",
        avatar: leader?.avatarUrl || "",
        role: leader?.roleName || "Trưởng ban",
      },
      content:
        "Đội vừa kick-off sprint mới. Mục tiêu: hoàn thiện backlog và onboard thành viên mới.",
      image: "",
      timestamp: new Date().toLocaleDateString("vi-VN"),
      likes: 12,
      comments: 3,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* LOADING / ERROR / PARAMS INVALID */}
      {!Number.isFinite(cId) || !Number.isFinite(tId) ? (
        <div className="p-6 text-sm text-muted-foreground">Tham số không hợp lệ.</div>
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
                    <h1 className="text-3xl font-bold mb-1">{teamName || "—"}</h1>
                    <p className="text-sm opacity-90">{teamDesc || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isLead && (
                    <Button
                      className="bg-white text-primary hover:bg-white/90"
                      onClick={() => nav(`/myclub/${cId}/teams/${tId}/news-editor`)}
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
                  { id: "posts", label: "Bài đăng", icon: FileText, show: true },
                  { id: "members", label: "Thành viên", icon: Users, show: true },
                  { id: "drafts", label: "Drafts", icon: FileText, show: !!isLead },
                  { id: "requests", label: "Requests", icon: Clock, show: !!isLead },
                ]
                  .filter((t) => t.show)
                  .map((tab) => {
                    const Icon = tab.icon as any;
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
            <div className="mb-6 text-sm text-muted-foreground">
              <span className="mr-4">
                Bạn thuộc team:{" "}
                <span className={memberFlag ? "text-green-600" : ""}>
                  {memberFlag ? "Có" : "Không"}
                </span>
              </span>
              <span className="mr-4">
                Vai trò của bạn: {myRoles.length ? myRoles.join(", ") : "—"}
              </span>
              <span>Tổng thành viên: {totalCount}</span>
              {guardErr ? <span className="ml-4 text-red-600">{guardErr}</span> : null}
            </div>

            {activeTab === "posts" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Bài đăng gần đây</h2>
                </div>
                <div className="space-y-6">
                  {mockPosts.map((p, i) => (
                    <PostCard
                      key={i}
                      author={p.author}
                      content={p.content}
                      image={p.image}
                      timestamp={p.timestamp}
                      likes={p.likes}
                      comments={p.comments}
                    />
                  ))}
                </div>
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
