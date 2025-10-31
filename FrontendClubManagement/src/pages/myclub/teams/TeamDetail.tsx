"use client";

import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTeamDetail } from "@/hooks/useTeamDetail";
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
  Mail,
  Phone,
  Heart,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";

/* ===== Helpers & inline subcomponents (không dùng hook ở đây) ===== */
type RoleTone = "leader" | "deputy" | "member" | "other";

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
  if (tone === "leader") return 0;   // Trưởng ban
  if (tone === "deputy") return 1;   // Phó ban
  if (tone === "member") return 2;   // Thành viên
  return 3;                          // Khác
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

        {/* Optional quick action */}
        {/* <Button variant="outline" size="sm">Xem hồ sơ</Button> */}
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
      {/* Header */}
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
          <p className="text-sm text-muted-foreground">{author.role ?? "Thành viên"} · {timestamp}</p>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap">{shown}</p>
        {over && (
          <Button variant="link" className="p-0 h-auto text-primary" onClick={() => setExpanded(v => !v)}>
            {expanded ? "Ẩn bớt" : "Xem thêm"}
          </Button>
        )}
      </div>

      {/* Image */}
      {image && <img src={image} alt="Post" className="w-full object-cover max-h-96" />}

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-top border-t">
        <span>{likes} lượt thích</span>
        <span>{comments} bình luận</span>
      </div>

      {/* Actions */}
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
  const { clubId = "0", teamId = "0" } = useParams();
  const cId = Number(clubId);
  const tId = Number(teamId);

  const [activeTab, setActiveTab] = useState<"posts" | "members">("posts");
  const [search, setSearch] = useState("");

  // ALWAYS call hooks first
  const { data, loading, error } = useTeamDetail(cId, tId);

  // Safe derivations (để hooks dưới luôn được gọi cùng số lượng)
  const teamName = data?.teamName ?? "";
  const teamDesc = data?.description ?? "";
  const myRoles = data?.myRoles ?? [];
  const memberFlag = !!data?.member;
  const rawMembers = data?.members ?? [];
  const totalCount = (data?.memberCount ?? rawMembers.length) || 0;

  // Chuẩn hóa members
  const members = useMemo(() => {
    return rawMembers.map((m: any) => ({
      id: m.userId,
      name: m.fullName,
      roleName: m.roleName as string | undefined,
      email: m.email as string | undefined,
      studentCode: m.studentCode as string | undefined,
      avatarUrl: (m.avatarUrl as string | undefined) || "",
    }));
  }, [rawMembers]);

  // Leader/Deputy để hiển thị avatar ở header
  const leader = useMemo(() => members.find(m => roleToneFrom(m.roleName) === "leader"), [members]);
  const deputy = useMemo(() => members.find(m => roleToneFrom(m.roleName) === "deputy"), [members]);

  // Search filter
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

  // Sort theo ưu tiên vai trò + tên
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

  // Mock posts (có thể thay bằng API thật)
  const mockPosts = [
    {
      author: {
        name: leader?.name || teamName || "Team",
        avatar: leader?.avatarUrl || "",
        role: leader?.roleName || "Trưởng ban",
      },
      content: "Đội vừa kick-off sprint mới. Mục tiêu: hoàn thiện backlog và onboard thành viên mới.",
      image: "",
      timestamp: new Date().toLocaleDateString("vi-VN"),
      likes: 12,
      comments: 3,
    },
  ];

  // Sau khi tất cả hooks đã gọi, mới return sớm
  if (!Number.isFinite(cId) || !Number.isFinite(tId)) {
    return <div className="p-6 text-sm text-muted-foreground">Tham số không hợp lệ.</div>;
  }
  if (loading) return <div className="p-6">Đang tải…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-background">
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

            <div className="flex items-center gap-8">
              <div className="flex flex-col gap-2 text-sm">
                <InfoRow icon={<Mail className="w-4 h-4" />}>contact@club.com</InfoRow>
                <InfoRow icon={<Phone className="w-4 h-4" />}>+84 123 456 789</InfoRow>
              </div>

              <div className="flex items-center gap-2">
                {leader && (
                  <div className="relative group">
                    <Avatar className="h-8 w-8 border-2 border-white cursor-pointer">
                      <AvatarImage src={leader.avatarUrl} />
                      <AvatarFallback className="bg-white/20 text-white">
                        {leader.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {leader.name} - {leader.roleName}
                    </div>
                  </div>
                )}
                {deputy && (
                  <div className="relative group">
                    <Avatar className="h-8 w-8 border-2 border-white cursor-pointer">
                      <AvatarImage src={deputy.avatarUrl} />
                      <AvatarFallback className="bg-white/20 text-white">
                        {deputy.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {deputy.name} - {deputy.roleName}
                    </div>
                  </div>
                )}
                <div className="text-xs opacity-75 ml-2">
                  +{Math.max(totalCount - (leader ? 1 : 0) - (deputy ? 1 : 0), 0)}
                </div>
              </div>

              <Button className="bg-white text-primary hover:bg-white/90">
                <Edit2 className="w-4 h-4 mr-2" />
                Chỉnh sửa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: "posts", label: "Bài đăng", icon: FileText },
              { id: "members", label: "Thành viên", icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === (tab.id as any);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "posts" | "members")}
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
        {/* Summary */}
        <div className="mb-6 text-sm text-muted-foreground">
          <span className="mr-4">
            Bạn thuộc team:{" "}
            <span className={memberFlag ? "text-green-600" : ""}>
              {memberFlag ? "Có" : "Không"}
            </span>
          </span>
          <span className="mr-4">Vai trò của bạn: {myRoles.length ? myRoles.join(", ") : "—"}</span>
          <span>Tổng thành viên: {totalCount}</span>
        </div>

        {/* POSTS */}
        {activeTab === "posts" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Bài đăng gần đây</h2>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Đăng bài
              </Button>
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

        {/* MEMBERS (list + sorted) */}
        {activeTab === "members" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Danh sách thành viên</h2>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Thêm thành viên
              </Button>
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

            {/* LIST thay vì grid, đã sắp xếp theo vai trò */}
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
      </div>
    </div>
  );
}
