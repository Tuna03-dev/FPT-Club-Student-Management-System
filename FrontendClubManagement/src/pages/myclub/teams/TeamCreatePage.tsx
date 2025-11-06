import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, X } from "lucide-react";
import { createTeam } from "@/api/teams";
import type { CreateTeamPayload } from "@/types/team";
import { getAvailableMembers } from "@/api/members";

type MemberRole = "leader" | "deputy" | "member";

interface Member {
  id: string;
  name: string;
  role?: MemberRole;
}

/* ================= MemberSelector ================= */
function MemberSelector({
  clubId,
  onAddMember,
  selectedIds,
}: {
  clubId: number;
  onAddMember: (m: Member) => void;
  selectedIds: string[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!clubId) return;
      try {
        setLoading(true);
        const list = await getAvailableMembers(clubId);
        if (!alive) return;
        setAvailableMembers(
          (list || []).map((m: any) => ({
            id: String(m.userId),
            name: m.fullName,
          }))
        );
      } catch {
        if (!alive) return;
        setAvailableMembers([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [clubId]);

  const filtered = useMemo(() => {
    const kw = searchTerm.toLowerCase().trim();
    const selectedSet = new Set(selectedIds);
    return availableMembers
      .filter((m) => !selectedSet.has(m.id)) // ẩn người đã chọn
      .filter((m) => (kw ? m.name.toLowerCase().includes(kw) : true)); // trống → hiện tất cả
  }, [availableMembers, searchTerm, selectedIds]);

  const handleFocus = () => setIsDropdownOpen(true);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="space-y-3" ref={boxRef}>
      <Label className="text-gray-700 font-semibold">Tìm thành viên</Label>
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder={loading ? "Đang tải danh sách..." : "Tìm kiếm theo tên..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleFocus}
              disabled={loading}
              className="pl-10 border-gray-300 focus:border-blue-500"
            />
          </div>
        </div>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-30 max-h-64 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((member) => (
                <div
                  key={member.id}
                  className="p-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between group border-b last:border-b-0"
                >
                  <span className="text-gray-900 font-medium">{member.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onAddMember(member);
                      setSearchTerm("");
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {loading ? "Đang tải…" : "Không tìm thấy thành viên"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Trang Tạo Phòng Ban ================= */
export default function TeamCreatePage() {
  const navigate = useNavigate();
  const { clubId = "0" } = useParams();
  const numericClubId = Number(clubId);

  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [linkGroupChat, setLinkGroupChat] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [leader, setLeader] = useState<Member | null>(null);
  const [deputy, setDeputy] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAddMember = (member: Member) => {
    if (!selectedMembers.find((m) => m.id === member.id)) {
      setSelectedMembers((prev) => [...prev, member]);
    }
  };

  const handleRemoveMember = (id: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
    if (leader?.id === id) setLeader(null);
    if (deputy?.id === id) setDeputy(null);
  };

  const handleSetLeader = (m: Member) => {
    if (deputy?.id === m.id) setDeputy(null); // không cho 1 người giữ 2 vai
    setLeader((cur) => (cur?.id === m.id ? null : m)); // toggle
  };

  const handleSetDeputy = (m: Member) => {
    if (leader?.id === m.id) setLeader(null);
    setDeputy((cur) => (cur?.id === m.id ? null : m)); // toggle
  };

  const memberUserIds = useMemo(() => {
    const exclude = new Set([leader?.id, deputy?.id].filter(Boolean) as string[]);
    return selectedMembers
      .map((m) => m.id)
      .filter((id) => !exclude.has(id))
      .map((id) => parseInt(id, 10));
  }, [selectedMembers, leader, deputy]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload: CreateTeamPayload = {
      clubId: numericClubId,
      teamName: teamName.trim(),
      description: description.trim() || undefined,
      linkGroupChat: linkGroupChat.trim() || undefined,
      leaderUserId: leader ? parseInt(leader.id, 10) : undefined,
      viceLeaderUserId: deputy ? parseInt(deputy.id, 10) : undefined,
      memberUserIds: memberUserIds.length ? memberUserIds : undefined,
    };

    try {
      setSubmitting(true);
      const result = await createTeam(payload);
      navigate(`/myclub/${clubId}/teams/${result.id}`);
    } catch (err: any) {
      alert(err?.message || "Không thể tạo phòng ban.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 md:p-6 max-w-3xl">
      {/* Thông tin cơ bản */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
          <CardTitle>Tạo phòng ban</CardTitle>
          <CardDescription className="text-blue-100">
            Nhập thông tin chi tiết về phòng ban mới
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-gray-700 font-semibold">
              Tên phòng ban <span className="text-red-500">*</span>
            </Label>
            <Input
              id="team-name"
              placeholder="Ví dụ: Ban Truyền thông"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              className="border-gray-300 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-700 font-semibold">
              Mô tả
            </Label>
            <Textarea
              id="description"
              placeholder="Mô tả chức năng và trách nhiệm của phòng ban..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="border-gray-300 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-link" className="text-gray-700 font-semibold">
              Link nhóm chat
            </Label>
            <Input
              id="group-link"
              placeholder="https://..."
              value={linkGroupChat}
              onChange={(e) => setLinkGroupChat(e.target.value)}
              type="url"
              className="border-gray-300 focus:border-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chọn thành viên */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle>Chọn thành viên</CardTitle>
          <CardDescription className="text-indigo-100">
            Thêm thành viên vào phòng ban (tùy chọn)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <MemberSelector
            clubId={numericClubId}
            selectedIds={selectedMembers.map((m) => m.id)}
            onAddMember={handleAddMember}
          />
        </CardContent>
      </Card>

      {/* Danh sách đã chọn + gán vai trò */}
      {selectedMembers.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gray-50 rounded-t-lg border-b">
            <CardTitle className="text-lg">
              Danh sách thành viên ({selectedMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {selectedMembers.map((m) => {
                const isLeader = leader?.id === m.id;
                const isDeputy = deputy?.id === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleSetLeader(m)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            isLeader
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          title={isLeader ? "Bỏ Trưởng ban" : "Gán Trưởng ban"}
                        >
                          Trưởng ban
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDeputy(m)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            isDeputy
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          title={isDeputy ? "Bỏ Phó ban" : "Gán Phó ban"}
                        >
                          Phó ban
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Bỏ thành viên khỏi danh sách"
                    >
                      <X size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tóm tắt phân công */}
      {(leader || deputy) && (
        <Card className="border-0 shadow-lg bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Tóm tắt phân công</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leader && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-blue-700">Trưởng ban:</span> {leader.name}
              </p>
            )}
            {deputy && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-indigo-700">Phó ban:</span> {deputy.name}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold"
        >
          <Plus size={18} className="mr-2" />
          {submitting ? "Đang tạo..." : "Tạo phòng ban"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={() => navigate(-1)}
          disabled={submitting}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
