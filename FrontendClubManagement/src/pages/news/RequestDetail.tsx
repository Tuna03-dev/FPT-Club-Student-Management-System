// src/pages/news/RequestDetail.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { requestsApi } from "@/api/newsRequests";
import type { NewsRequest, UpdateNewsRequestPayload } from "@/types/news";
import { uploadImageOnly } from "@/api/uploads";
import {
  ArrowLeft,
  CheckCircle2,
  Pencil,
  Save,
  XCircle,
  Ban,
  Tag,
  Info,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

// UI
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

// Realtime
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";

/* ===== helper: lấy user hiện tại ===== */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { id: null as number | null, sysRole: "OTHER" as string };
    const u = JSON.parse(raw);
    const sys =
      (u?.systemRole || u?.role || {}).roleName || u?.systemRole || "";
    return {
      id: Number(u?.id) || null,
      sysRole: String(sys || "").toUpperCase(),
    };
  } catch {
    return { id: null as number | null, sysRole: "OTHER" };
  }
}

// ===== NEWS TYPES =====
const NEWS_TYPES = [
  { value: "Tin chung", label: "Tin chung" },
  { value: "Sự kiện", label: "Sự kiện" },
  { value: "Thành tích", label: "Thành tích" },
  { value: "Tuyển thành viên", label: "Tuyển thành viên" },
  { value: "Lập trình", label: "Lập trình" },
  { value: "Thể Thao", label: "Thể Thao" },
] as const;

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

const statusLabel = (s?: string): string => {
  const map: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING_CLUB: "Chờ duyệt (CLB)",
    APPROVED_CLUB: "Đã duyệt (CLB)",
    REJECTED_CLUB: "Từ chối (CLB)",
    PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
    APPROVED_UNIVERSITY: "Đã duyệt (Trường)",
    REJECTED_UNIVERSITY: "Từ chối (Trường)",
    CANCELED: "Đã hủy",
  };
  return map[s || "CANCELED"] || "—";
};

type ConfirmKind = "clubApprove" | "staffApprove" | "cancelReq";

export default function RequestDetail() {
  const nav = useNavigate();
  const { clubId: clubIdParam, teamId: teamIdParam, id: idParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const clubId = Number(clubIdParam);
  const teamIdOnUrl = Number(teamIdParam); // có thể NaN nếu không có /teams/:teamId
  const id = Number(idParam);

  const { id: meId, sysRole } = getCurrentUser();
  const isStaff = sysRole === "STAFF" || sysRole === "ADMIN";

  // Realtime
  const token = localStorage.getItem("accessToken");
  const { isConnected, subscribeToClub, subscribeToUserQueue } =
    useWebSocket(token);

  // banners (giữ để hiển thị realtime nếu cần)
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
  void setInfoBanner; // không dùng nhưng giữ cho sau này

  // data & flags
  const [item, setItem] = useState<NewsRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [doing, setDoing] = useState<string | null>(null);

  // edit state (in-place, đồng nhất UI với StaffNewsEditor)
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(""); // URL hiện đang lưu ở server
  const [newsType, setNewsType] = useState("");

  // field errors (validate đủ 4 trường & lỗi đỏ)
  const [titleErr, setTitleErr] = useState<string | null>(null);
  const [contentErr, setContentErr] = useState<string | null>(null);
  const [imageErr, setImageErr] = useState<string | null>(null);
  const [typeErr, setTypeErr] = useState<string | null>(null);

  // (giữ cho future) reject reason
  const [reason, setReason] = useState("");

  // preview & file (giống StaffNewsEditor)
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [fileObj, setFileObj] = useState<File | null>(null);

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("vi-VN") : "—";
  void reason;
  const reload = async () => {
    const rs = await requestsApi.getDetail(id);
    const data = (rs as any).data ?? rs?.data ?? rs;
    setItem(data as NewsRequest);
    // đồng bộ form
    setTitle(data.requestTitle || "");
    setContent(data.description || "");
    setThumbnailUrl(data.thumbnailUrl || "");
    setThumbPreview(data.thumbnailUrl || "");
    setNewsType(data.newsType || "");
  };

  // load initial
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await reload();
      } catch (e: any) {
        if (alive) toast.error(e?.message || "Không tải được request.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // auto mở form sửa nếu ?edit=1 và có quyền
  useEffect(() => {
    if (!item) return;
    const wantEdit = searchParams.get("edit") === "1";
    const isCreator =
      !!meId && !!item.createdByUserId && meId === item.createdByUserId;
    const canEditNow =
      isCreator &&
      (item.status === "PENDING_CLUB" ||
        item.status === "PENDING_UNIVERSITY" ||
        item.status === "CANCELED");

    if (wantEdit && canEditNow) {
      setEditing(true);
      const sp = new URLSearchParams(searchParams);
      sp.delete("edit");
      setSearchParams(sp, { replace: true });
    }
  }, [item, meId, searchParams, setSearchParams]);

  // realtime subscriptions
  useEffect(() => {
    if (!isConnected) return;
    const offClub =
      Number.isFinite(clubId) &&
      subscribeToClub(clubId, (msg: any) => {
        if (msg.type === "NEWS_REQUEST") {
          if (
            [
              "UPDATED",
              "APPROVED_CLUB",
              "REJECTED_CLUB",
              "PENDING_UNIVERSITY",
              "APPROVED_UNIVERSITY",
              "REJECTED_UNIVERSITY",
              "CANCELED",
            ].includes(msg.action)
          ) {
            reload();
            const map: Record<string, string> = {
              UPDATED: "Request vừa được cập nhật.",
              APPROVED_CLUB: "Request đã được duyệt ở cấp CLB.",
              REJECTED_CLUB: "Request đã bị từ chối ở cấp CLB.",
              PENDING_UNIVERSITY: "Request đã gửi lên cấp Trường.",
              APPROVED_UNIVERSITY: "Request đã được duyệt ở cấp Trường.",
              REJECTED_UNIVERSITY: "Request đã bị từ chối ở cấp Trường.",
              CANCELED: "Request đã bị hủy.",
            };
            toast.info(map[msg.action] || "Request thay đổi trạng thái.");
          }
        }
        if (
          msg.type === "NEWS_DRAFT" &&
          ["SUBMITTED", "DELETED", "UPDATED"].includes(msg.action)
        ) {
          reload();
        }
      });

    const offMe = subscribeToUserQueue((msg: any) => {
      if (msg.type === "NEWS_REQUEST") {
        if (
          [
            "APPROVED_CLUB",
            "REJECTED_CLUB",
            "PENDING_UNIVERSITY",
            "APPROVED_UNIVERSITY",
            "REJECTED_UNIVERSITY",
            "CANCELED",
            "UPDATED",
          ].includes(msg.action)
        ) {
          reload();
        }
      }
    });

    return () => {
      typeof offClub === "function" && offClub();
      typeof offMe === "function" && offMe();
    };
  }, [isConnected, clubId, subscribeToClub, subscribeToUserQueue]);

  // ===== navigation helper =====
  const goBack = () => {
    if (Number.isFinite(teamIdOnUrl) && Number.isFinite(clubId)) {
      nav(`/myclub/${clubId}/teams/${teamIdOnUrl}?tab=requests`);
    } else if (Number.isFinite(clubId)) {
      nav(`/myclub/${clubId}/news?tab=requests`);
    } else {
      nav(-1);
    }
  };

  // ===== permission flags =====
  const isCreator =
    !!meId && !!item?.createdByUserId && meId === item?.createdByUserId;
  const isPendingClub = item?.status === "PENDING_CLUB";
  const isPendingUni = item?.status === "PENDING_UNIVERSITY";
  const isCanceled = item?.status === "CANCELED";

  const showClubActions =
    !!item && isPendingClub && !isStaff && !!item.teamId && !isCreator;
  const showStaffActions = !!item && isPendingUni && isStaff;
  const showCancel = !!item && isCreator && (isPendingClub || isPendingUni);
  const canEdit =
    !!item && isCreator && (isPendingClub || isPendingUni || isCanceled);

  // ===== confirm modal state (đưa hook lên trên, không để sau return) =====
  const [confirmState, setConfirmState] = useState<null | ConfirmKind>(null);

  const handleConfirmOk = async () => {
    if (!item || !confirmState) return;
    const action = confirmState;
    setConfirmState(null);
    setDoing(action);
    try {
      if (action === "clubApprove") {
        await requestsApi.clubApproveAndSubmit(item.id);
        toast.success("Đã duyệt & gửi lên cấp Trường.");
      } else if (action === "staffApprove") {
        await requestsApi.staffApprovePublish(item.id, {});
        toast.success("Đã duyệt & đăng tin.");
      } else if (action === "cancelReq") {
        await requestsApi.cancel(item.id);
        toast.success(
          "Đã hủy yêu cầu. Yêu cầu được lưu về trong mục bản nháp bạn có thể sửa & gửi lại."
        );
      }
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Thao tác thất bại.");
    } finally {
      setDoing(null);
    }
  };

  const handleReject = async (
    role: "club" | "staff",
    reasonInput: string,
    setErr: (s: string | null) => void
  ) => {
    if (!item) return;
    if (!reasonInput.trim()) {
      setErr("Vui lòng nhập lý do từ chối.");
      return;
    }
    setDoing(role === "club" ? "clubReject" : "staffReject");
    try {
      if (role === "club") {
        await requestsApi.clubPresidentReject(item.id, {
          reason: reasonInput.trim(),
        });
        toast.success("Đã từ chối ở cấp CLB.");
      } else {
        await requestsApi.staffReject(item.id, { reason: reasonInput.trim() });
        toast.success("Đã từ chối ở cấp Trường.");
      }
      setReason("");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Không từ chối được.");
    } finally {
      setDoing(null);
    }
  };

  // ====== Validate 4 trường khi lưu chỉnh sửa ======
  const validateAll = () => {
    let ok = true;

    if (!title.trim()) {
      setTitleErr("Vui lòng nhập tiêu đề.");
      ok = false;
    } else setTitleErr(null);

    if (!content.trim()) {
      setContentErr("Vui lòng nhập nội dung.");
      ok = false;
    } else setContentErr(null);

    if (!newsType) {
      setTypeErr("Vui lòng chọn loại bản tin.");
      ok = false;
    } else setTypeErr(null);

    // const hasImage = Boolean(thumbPreview || thumbnailUrl);
    // if (!hasImage) {
    //   setImageErr("Vui lòng chọn ảnh bìa.");
    //   ok = false;
    // } else setImageErr(null);

    return ok;
  };

  const saveEdit = async () => {
    if (!item) return;
    if (!validateAll()) return;

    setDoing("save");
    try {
      let finalThumb = thumbnailUrl || undefined;
      if (fileObj) {
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url; // BE trả url ảnh đã upload
        setThumbnailUrl(up.url);
      }

      const payload: UpdateNewsRequestPayload = {
        title: title.trim(),
        content: content.trim(),
        thumbnailUrl: finalThumb ?? null,
        newsType: newsType || undefined,
      };

      await requestsApi.update(item.id, payload);
      await reload();
      setEditing(false);

      // clear preview/file state
      setThumbPreview("");
      setFileObj(null);

      toast.success("Đã lưu thay đổi.");
    } catch (e: any) {
      toast.error(e?.message || "Không lưu được.");
    } finally {
      setDoing(null);
    }
  };

  // ===== render helpers =====
  const isSubmitDisabled = doing === "save";
  const isClubApproveLoading = doing === "clubApprove";
  const isStaffApproveLoading = doing === "staffApprove";
  const isCancelLoading = doing === "cancel";
  const isClubRejectLoading = doing === "clubReject";
  const isStaffRejectLoading = doing === "staffReject";

  const isAuthorStaff = !item?.clubId;
  const metaLine = item ? (
    isAuthorStaff ? (
      <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
        <span>Nhà Trường</span>
        {item.createdByFullName && (
          <span>
            {item.createdByFullName}
            {item.createdByEmail ? ` (${item.createdByEmail})` : ""}
          </span>
        )}
        {item.requestDate && <span>Gửi lúc {fmt(item.requestDate)}</span>}
      </div>
    ) : (
      <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
        {item.clubName && <span>CLB {item.clubName}</span>}
        {item.teamName && <span>Phòng ban {item.teamName}</span>}
        {item.createdByFullName && (
          <span>
            Bởi {item.createdByFullName}
            {item.createdByEmail ? ` (${item.createdByEmail})` : ""}
          </span>
        )}
        {item.requestDate && <span>Gửi lúc {fmt(item.requestDate)}</span>}
      </div>
    )
  ) : null;

  // ===== single return — không còn early return =====
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Banners */}
      {infoBanner && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
          <Info className="h-4 w-4" /> <span>{infoBanner}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
      </div>

      {/* Loading / Empty states */}
      {loading && (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden bg-slate-100">
            <div className="w-full h-[340px] bg-slate-200 animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-6 w-24 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-5 w-28 rounded-full bg-slate-200 animate-pulse" />
            </div>
            <div className="h-10 w-3/5 rounded bg-slate-200 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="grid gap-3">
            <div className="space-y-2">
              <div className="h-4 rounded bg-slate-200 w-full animate-pulse" />
              <div className="h-4 rounded bg-slate-200 w-full animate-pulse" />
              <div className="h-4 rounded bg-slate-200 w-5/6 animate-pulse" />
              <div className="h-4 rounded bg-slate-200 w-2/3 animate-pulse" />
              <div className="h-4 rounded bg-slate-200 w-4/5 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {!loading && !item && (
        <div className="space-y-3">
          <div>Không có dữ liệu.</div>
        </div>
      )}

      {!loading && item && (
        <>
          {/* HERO THUMBNAIL / EDIT PREVIEW */}
          <div className="rounded-2xl overflow-hidden bg-slate-100">
            {editing ? (
              <DropImagePreview
                preview={thumbPreview || thumbnailUrl}
                onPick={(file, dataUrl) => {
                  setFileObj(file);
                  setThumbPreview(dataUrl);
                  if (imageErr) setImageErr(null);
                }}
                onClear={() => {
                  setFileObj(null);
                  setThumbPreview("");
                  setThumbnailUrl(null as any);
                }}
              />
            ) : thumbPreview || thumbnailUrl ? (
              <img
                src={thumbPreview || thumbnailUrl}
                alt={item.requestTitle || "thumbnail"}
                className="w-full h-[340px] object-cover"
              />
            ) : (
              <div className="w-full h-[220px] bg-gradient-to-br from-slate-100 to-slate-200" />
            )}
          </div>
          {editing && imageErr && (
            <p className="text-xs text-rose-600 mt-1">* {imageErr}</p>
          )}

          {/* TITLE + STATUS + TYPE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={badgeClass(item.status)}>
                {statusLabel(item.status)}
              </span>
              {item.newsType && !editing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
                  <Tag className="h-3.5 w-3.5" /> {item.newsType}
                </span>
              )}
            </div>

            {!editing ? (
              <>
                <h1 className="text-3xl font-extrabold tracking-tight leading-snug">
                  {item.requestTitle || "—"}
                </h1>
                {metaLine}
              </>
            ) : (
              <>
                {/* Title */}
                <div>
                  <input
                    className={`w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                      titleErr ? "border-rose-300 focus:ring-rose-200" : ""
                    }`}
                    placeholder="Tiêu đề"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (titleErr && e.target.value.trim()) setTitleErr(null);
                    }}
                  />
                  {titleErr && (
                    <p className="mt-1 text-xs text-rose-600">{titleErr}</p>
                  )}
                </div>

                {/* Content + Type */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <textarea
                      className={`w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none min-h-[180px] ${
                        contentErr ? "border-rose-300 focus:ring-rose-200" : ""
                      }`}
                      placeholder="Nội dung"
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (contentErr && e.target.value.trim())
                          setContentErr(null);
                      }}
                    />
                    {contentErr && (
                      <p className="mt-1 text-xs text-rose-600">{contentErr}</p>
                    )}
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-sm font-medium text-foreground">
                      Loại bản tin
                    </label>
                    <Select
                      value={newsType || undefined}
                      onValueChange={(v) => {
                        setNewsType(v);
                        if (typeErr && v) setTypeErr(null);
                      }}
                    >
                      <SelectTrigger
                        className={`w-full px-4 py-2.5 rounded-lg border bg-background ${typeErr ? "border-rose-300" : "border-border"}`}
                      >
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                      <SelectContent>
                        {NEWS_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {typeErr && (
                      <p className="mt-1 text-xs text-rose-600">{typeErr}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CONTENT (view-mode) */}
          {!editing && (
            <article className="prose max-w-none leading-relaxed whitespace-pre-wrap">
              {item.description || "—"}
            </article>
          )}

          {/* INFO */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-semibold text-slate-700">
              Thông tin
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoBox
                label="Phản hồi / Ghi chú"
                value={item.responseMessage || "—"}
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col gap-2">
            {/* Chủ nhiệm CLB */}
            {showClubActions && (
              <>
                <button
                  onClick={() => setConfirmState("clubApprove")}
                  disabled={isClubApproveLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-60 text-sm h-9"
                >
                  <CheckCircle2 className="h-4 w-4" />{" "}
                  {isClubApproveLoading ? "Đang duyệt…" : "Duyệt"}
                </button>

                <RejectModalTrigger
                  labelBtn="Từ chối"
                  loading={isClubRejectLoading}
                  onSubmit={(r, setErr) => handleReject("club", r, setErr)}
                  isSmall
                />
              </>
            )}

            {/* Staff/Admin */}
            {showStaffActions && (
              <>
                <button
                  onClick={() => setConfirmState("staffApprove")}
                  disabled={isStaffApproveLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-60 text-sm h-9"
                >
                  <CheckCircle2 className="h-4 w-4" />{" "}
                  {isStaffApproveLoading ? "Đang duyệt…" : "Duyệt"}
                </button>

                <RejectModalTrigger
                  labelBtn="Từ chối"
                  loading={isStaffRejectLoading}
                  onSubmit={(r, setErr) => handleReject("staff", r, setErr)}
                  isSmall
                />
              </>
            )}

            {/* Creator: Hủy / Sửa */}
            <div className="flex flex-col sm:flex-row gap-2">
              {showCancel && (
                <button
                  onClick={() => setConfirmState("cancelReq")}
                  disabled={isCancelLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Ban className="h-4 w-4" />{" "}
                  {isCancelLoading ? "Đang hủy…" : "Hủy yêu cầu"}
                </button>
              )}
              {canEdit && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" /> Sửa yêu cầu
                </button>
              )}
              {editing && (
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={isSubmitDisabled}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isSubmitDisabled ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSubmitDisabled ? "Đang lưu…" : "Lưu thay đổi"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setThumbPreview("");
                      setFileObj(null);
                      setTitleErr(null);
                      setContentErr(null);
                      setTypeErr(null);
                      setImageErr(null);
                      // giữ nguyên thumbnailUrl (URL cũ) nếu người dùng không đổi
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
                  >
                    Hủy chỉnh sửa
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Confirm modal */}
          {confirmState && (
            <ConfirmModal
              title={
                confirmState === "clubApprove"
                  ? "Duyệt & gửi lên Staff"
                  : confirmState === "staffApprove"
                    ? "Duyệt & đăng tin"
                    : "Hủy yêu cầu"
              }
              message={
                confirmState === "clubApprove"
                  ? "Bạn chắc chắn duyệt và gửi yêu cầu này lên cấp Trường?"
                  : confirmState === "staffApprove"
                    ? "Bạn chắc chắn duyệt và đăng tin này?"
                    : "Bạn chắc chắn muốn hủy yêu cầu này?"
              }
              okText={
                confirmState === "clubApprove"
                  ? "Duyệt & Gửi"
                  : confirmState === "staffApprove"
                    ? "Duyệt & đăng tin"
                    : "Hủy"
              }
              okVariant={confirmState === "cancelReq" ? "danger" : "primary"}
              onOk={handleConfirmOk}
              onCancel={() => setConfirmState(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

/* ===== Small reusable modals (no external deps) ===== */
function ConfirmModal({
  title,
  message,
  onOk,
  onCancel,
  okText = "Xác nhận",
  cancelText = "Hủy",
  okVariant = "primary",
}: {
  title: string;
  message: string;
  onOk: () => void;
  onCancel: () => void;
  okText?: string;
  cancelText?: string;
  okVariant?: "primary" | "danger";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-700">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-3 py-1.5 rounded-lg border hover:bg-slate-50"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            onClick={onOk}
            className={`px-3 py-1.5 rounded-lg text-white ${
              okVariant === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModalTrigger({
  labelBtn,
  loading,
  onSubmit,
  isSmall,
}: {
  labelBtn: string;
  loading?: boolean;
  onSubmit: (reason: string, setReasonErr: (s: string | null) => void) => void;
  isSmall?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 ${
          isSmall ? "px-3 py-1.5 text-sm h-9" : "px-3 py-2"
        }`}
      >
        <XCircle className="h-4 w-4" /> {loading ? "Đang từ chối…" : labelBtn}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
            <h3 className="text-base font-semibold text-slate-900">
              {labelBtn}
            </h3>
            <div className="mt-3">
              <label className="text-sm font-medium text-slate-700">
                Lý do từ chối
              </label>
              <textarea
                className={`mt-1 w-full min-h-[100px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  err
                    ? "border-rose-300 focus:ring-rose-200"
                    : "focus:ring-indigo-200"
                }`}
                placeholder="Nhập lý do…"
                value={val}
                onChange={(e) => {
                  setVal(e.target.value);
                  if (err && e.target.value.trim()) setErr(null);
                }}
              />
              {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await onSubmit(val, setErr);
                  // nếu submit OK thì đóng
                  if (!err && val.trim()) setOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** ===== DropImagePreview: đồng nhất UI với StaffNewsEditor (DataURL preview, drag-drop, chặn dán link) ===== */
function DropImagePreview({
  preview,
  onPick,
  onClear,
}: {
  preview?: string;
  onPick: (file: File, dataUrl: string) => void;
  onClear: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);
  const hasImage = Boolean(preview);

  const open = () => inputEl?.click();

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const handleFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await readAsDataURL(file);
    onPick(file, dataUrl);
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed transition-all ${
        dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"
      } p-3`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        await handleFile(e.dataTransfer.files?.[0]);
      }}
      onPaste={(e) => {
        // chặn dán link
        if (e.clipboardData?.getData("text/plain")) e.preventDefault();
      }}
    >
      <div
        className="aspect-[16/9] w-full rounded-md bg-white overflow-hidden cursor-pointer"
        onClick={open}
      >
        {hasImage ? (
          <img
            src={preview}
            alt="thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            Kéo-thả hoặc bấm để chọn ảnh
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm font-medium"
        >
          Chọn ảnh
        </button>
        {hasImage && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm font-medium"
          >
            Xóa
          </button>
        )}
      </div>

      <input
        ref={setInputEl}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          await handleFile(f || undefined);
          if (e.currentTarget) e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
