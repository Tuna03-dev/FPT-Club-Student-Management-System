import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, X } from "lucide-react";
import { createTeam } from "@/api/teams";
import type { CreateTeamPayload } from "@/types/team";
import { getAvailableMembers } from "@/api/members";
import { toast } from "sonner";

type MemberRole = "leader" | "deputy" | "member";

interface Member {
  id: string;
  name: string;
  role?: MemberRole;
}

interface FormErrors {
  teamName?: string;
  description?: string;
  linkGroupChat?: string;
  general?: string;
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
      } catch (err: any) {
        if (!alive) return;

        toast.error(
          err?.response?.data?.message ||
            "Không thể tải danh sách thành viên. Vui lòng thử lại."
        );

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
      .filter((m) => !selectedSet.has(m.id))
      .filter((m) => (kw ? m.name.toLowerCase().includes(kw) : true));
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
      <Label className="text-gray-800 font-semibold flex items-center gap-2">
        Tìm thành viên
        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
          Tùy chọn
        </span>
      </Label>
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              placeholder={
                loading ? "Đang tải danh sách..." : "Tìm kiếm theo tên..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleFocus}
              disabled={loading}
              className="pl-10 border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-64 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((member) => (
                <div
                  key={member.id}
                  className="p-3 hover:bg-orange-50 cursor-pointer flex items-center justify-between group border-b last:border-b-0"
                >
                  <span className="text-gray-900 font-medium">
                    {member.name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onAddMember(member);
                      setSearchTerm("");
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500 hover:bg-orange-600 text-white"
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
  const [errors, setErrors] = useState<FormErrors>({});

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
    if (deputy?.id === m.id) setDeputy(null);
    setLeader((cur) => (cur?.id === m.id ? null : m));
  };

  const handleSetDeputy = (m: Member) => {
    if (leader?.id === m.id) setLeader(null);
    setDeputy((cur) => (cur?.id === m.id ? null : m));
  };

  const memberUserIds = useMemo(() => {
    const exclude = new Set(
      [leader?.id, deputy?.id].filter(Boolean) as string[]
    );
    return selectedMembers
      .map((m) => m.id)
      .filter((id) => !exclude.has(id))
      .map((id) => parseInt(id, 10));
  }, [selectedMembers, leader, deputy]);

  // Validate "tên phòng ban có nghĩa" giống BE (client-side)
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

    // ❌ Cấm chứa số giống BE
    if (/\d/.test(trimmedName)) {
      return "Tên phòng ban không được chứa số.";
    }

    // Không cho toàn số (phòng hờ)
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

  function validateForm() {
    const newErrors: FormErrors = {};

    const trimmedName = teamName.trim();
    const trimmedDesc = description.trim();
    const trimmedLink = linkGroupChat.trim();

    if (!trimmedName) {
      newErrors.teamName = "Vui lòng nhập tên phòng ban.";
    } else {
      const nameError = validateMeaningfulTeamNameClient(trimmedName);
      if (nameError) {
        newErrors.teamName = nameError;
      }
    }

    if (!trimmedDesc) {
      newErrors.description = "Vui lòng nhập mô tả phòng ban.";
    } else if (trimmedDesc.length < 10) {
      newErrors.description = "Mô tả cần ít nhất 10 ký tự để mô tả rõ hơn.";
    }

    if (trimmedLink) {
      try {
        new URL(trimmedLink);
      } catch {
        newErrors.linkGroupChat =
          "Link nhóm chat không hợp lệ. Vui lòng nhập dạng https://...";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, general: undefined }));

    if (!validateForm()) {
      return;
    }

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
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể tạo phòng ban. Vui lòng thử lại.";

      // Lỗi trùng tên ban -> hiện cạnh input
      if (msg.toLowerCase().includes("tên ban")) {
        setErrors((prev) => ({
          ...prev,
          teamName: msg,
          general: undefined,
        }));
        return;
      }

      // Lỗi khác -> hiện toast
      toast.error(msg);

      setErrors((prev) => ({
        ...prev,
        general: undefined,
      }));

      if (msg.toLowerCase().includes("tên ban")) {
        setErrors((prev) => ({
          ...prev,
          teamName: msg,
          general: undefined,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          general: msg,
        }));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 px-4 md:px-6 pt-0 pb-6 w-full mx-auto"
    >
      {/* Header tổng thể */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="inline-block w-2 h-6 rounded-full bg-orange-500" />
          Tạo phòng ban mới
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Thiết lập thông tin cơ bản và phân công nhân sự cho phòng ban trong
          CLB.
        </p>
      </div>

      {/* Thông tin cơ bản */}
      <Card className="rounded-2xl shadow-md bg-white overflow-hidden">
        <CardHeader className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardTitle className="w-full text-white">
            Tên & thông tin phòng ban
          </CardTitle>
          <CardDescription className="text-orange-100/90 w-full">
            Đây là thông tin sẽ hiển thị cho toàn bộ thành viên.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-6 pt-4 space-y-4 bg-white">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-gray-800 font-semibold">
              Tên phòng ban <span className="text-red-500">*</span>
            </Label>
            <Input
              id="team-name"
              placeholder="Ví dụ: Ban Truyền thông"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className={`border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ${
                errors.teamName ? "border-red-500" : ""
              }`}
            />
            {errors.teamName && (
              <p className="mt-1 text-sm text-red-500">{errors.teamName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-gray-800 font-semibold"
            >
              Mô tả <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Mô tả chức năng và trách nhiệm của phòng ban..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none ${
                errors.description ? "border-red-500" : ""
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-link" className="text-gray-800 font-semibold">
              Link nhóm chat{" "}
              <span className="text-xs text-gray-500 font-normal">
                (có thể để trống)
              </span>
            </Label>
            <Input
              id="group-link"
              placeholder="https://zalo.me/..., https://chat.whatsapp.com/..."
              value={linkGroupChat}
              onChange={(e) => setLinkGroupChat(e.target.value)}
              type="url"
              className={`border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ${
                errors.linkGroupChat ? "border-red-500" : ""
              }`}
            />
            {errors.linkGroupChat && (
              <p className="mt-1 text-sm text-red-500">
                {errors.linkGroupChat}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chọn thành viên */}
      <Card className="rounded-2xl shadow-md bg-white overflow-visible">
        <CardHeader className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardTitle className="w-full text-white">Chọn thành viên</CardTitle>
          <CardDescription className="text-orange-50/90 w-full">
            Thêm thành viên vào phòng ban để phân công vai trò (không bắt buộc).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-6 pt-4 bg-white">
          <MemberSelector
            clubId={numericClubId}
            selectedIds={selectedMembers.map((m) => m.id)}
            onAddMember={handleAddMember}
          />
        </CardContent>
      </Card>

      {/* Danh sách đã chọn + gán vai trò */}
      {selectedMembers.length > 0 && (
        <Card className="rounded-2xl overflow-hidden shadow-md bg-white">
          <CardHeader className="bg-orange-50 rounded-t-lg border-b border-orange-100 p-4">
            <CardTitle className="text-lg flex items-center justify-between w-full">
              <span>Danh sách thành viên ({selectedMembers.length})</span>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-normal text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                  Chọn Trưởng ban / Phó ban
                </span>
                <span className="text-[11px] text-gray-500 mt-1">
                  Nếu không, thành viên sẽ mặc định là thành viên bình thường
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="space-y-3">
              {selectedMembers.map((m) => {
                const isLeader = leader?.id === m.id;
                const isDeputy = deputy?.id === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-orange-50/40 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleSetLeader(m)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            isLeader
                              ? "bg-orange-500 text-white shadow-sm"
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
                              ? "bg-amber-500 text-white shadow-sm"
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

      {/* Lỗi chung từ server */}
      {errors.general && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.general}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Plus size={18} className="mr-2" />
          {submitting ? "Đang tạo..." : "Tạo phòng ban"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 bg-white border-gray-300 hover:bg-gray-50"
          onClick={() => navigate(`/myclub/${clubId}`)}
          disabled={submitting}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
