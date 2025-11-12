import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { requestsApi } from "@/api/newsRequests";
import type { NewsRequest, RequestStatus } from "@/types/news";
import { useTeamLeadGuard } from "@/hooks/useTeamLeadGuard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Search } from "lucide-react";

// ========== Types ==========
type FilterStatus = RequestStatus | "ALL";

// ========== Badge màu ==========
const badgeClass = (s?: string) => {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-500",
    PENDING_CLUB: "bg-amber-500",
    APPROVED_CLUB: "bg-emerald-600",
    REJECTED_CLUB: "bg-rose-600",
    PENDING_UNIVERSITY: "bg-amber-500",
    APPROVED_UNIVERSITY: "bg-emerald-600",
    REJECTED_UNIVERSITY: "bg-rose-600",
    CANCELED: "bg-slate-500",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${
    map[s || "CANCELED"] || "bg-slate-500"
  }`;
};

// ========== Nhãn tiếng Việt ==========
const statusLabel: Record<RequestStatus | "CANCELED" | "DRAFT", string> = {
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ duyệt (CLB)",
  APPROVED_CLUB: "Đã duyệt (CLB)",
  REJECTED_CLUB: "Từ chối (CLB)",
  PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
  APPROVED_UNIVERSITY: "Đã duyệt (Trường)",
  REJECTED_UNIVERSITY: "Từ chối (Trường)",
  CANCELED: "Đã hủy",
};

export default function TeamNewsRequests() {
  const { clubId: clubIdParam, teamId: teamIdParam } = useParams();
  const clubId = Number(clubIdParam);
  const teamId = Number(teamIdParam);
  const { allowed, error } = useTeamLeadGuard(clubId, teamId);

  const [list, setList] = useState<NewsRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState<FilterStatus>("PENDING_CLUB");

  const extractItems = (apiEnvelope: any): NewsRequest[] => {
    const payload = apiEnvelope?.data;
    if (payload && Array.isArray(payload.data)) return payload.data as NewsRequest[];
    if (payload && Array.isArray(payload.content)) return payload.content as NewsRequest[];
    if (Array.isArray(payload)) return payload as NewsRequest[];
    return [];
  };

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: 1, size: 100 };
      if (kw.trim()) params.keyword = kw.trim();
      if (status !== "ALL") params.status = status as RequestStatus; // "ALL" => không gửi status
      if (Number.isFinite(clubId)) params.clubId = clubId;
      if (Number.isFinite(teamId)) params.teamId = teamId;
      const res = await requestsApi.search(params);
      const items = extractItems(res.data);
      setList(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubIdParam, teamIdParam, kw, status]);

  if (allowed === false)
    return (
      <div className="p-4 text-sm text-red-600">
        Bạn không có quyền truy cập. {error}
      </div>
    );
  if (allowed === null)
    return <div className="p-4 text-sm text-slate-500">Đang kiểm tra quyền…</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Yêu cầu bài viết của Phòng ban
        </h1>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tiêu đề, mô tả…"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="DRAFT">Bản nháp</SelectItem>
            <SelectItem value="PENDING_CLUB">Chờ duyệt (CLB)</SelectItem>
            <SelectItem value="APPROVED_CLUB">Đã duyệt (CLB)</SelectItem>
            <SelectItem value="REJECTED_CLUB">Từ chối (CLB)</SelectItem>
            <SelectItem value="PENDING_UNIVERSITY">Chờ duyệt (Trường)</SelectItem>
            <SelectItem value="APPROVED_UNIVERSITY">Đã duyệt (Trường)</SelectItem>
            <SelectItem value="REJECTED_UNIVERSITY">Từ chối (Trường)</SelectItem>
            <SelectItem value="CANCELED">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Danh sách */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Đang tải…</div>
      ) : list.length > 0 ? (
        <div className="grid gap-3">
          {list.map((r) => (
            <Card key={r.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Người gửi */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={r.createdByAvatarUrl || ""} />
                      <AvatarFallback>{r.createdByFullName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium leading-tight">
                        {r.requestTitle || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.createdByFullName || "—"} •{" "}
                        {r.requestDate
                          ? new Date(r.requestDate).toLocaleString("vi-VN")
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Mô tả */}
                  <div className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                    {r.description ?? "—"}
                  </div>

                  {/* Club & Team */}
                  
                </div>

                {/* Badge trạng thái */}
                <span className={badgeClass(r.status)}>
                  {statusLabel[(r.status as RequestStatus) || "CANCELED"] || r.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Chưa có yêu cầu nào.
        </Card>
      )}
    </div>
  );
}
