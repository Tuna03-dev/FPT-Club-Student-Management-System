"use client"

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { requestsApi } from "@/api/newsRequests";
import type { NewsRequest, RequestStatus, UpdateNewsRequestPayload } from "@/types/news";
import { uploadImageOnly } from "../../api/uploads"; // giữ nguyên theo dự án của bạn
import {
  ArrowLeft, CheckCircle2, Pencil, Save, XCircle, Ban, Tag, Image as ImageIcon
} from "lucide-react";

// ✅ Thêm import Select
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

/* ===== helper: lấy user hiện tại ===== */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { id: null as number | null, sysRole: "OTHER" as string };
    const u = JSON.parse(raw);
    const sys = (u?.systemRole || u?.role || {}).roleName || u?.systemRole || "";
    return { id: Number(u?.id) || null, sysRole: String(sys || "").toUpperCase() };
  } catch {
    return { id: null as number | null, sysRole: "OTHER" };
  }
}

// ✅ Khai báo danh sách loại tin
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

export default function RequestDetail() {
  const nav = useNavigate();
  const { clubId: clubIdParam, teamId: teamIdParam, id: idParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const clubId = Number(clubIdParam);
  const teamIdOnUrl = Number(teamIdParam); // có thể NaN nếu không có /teams/:teamId
  const id = Number(idParam);

  const { id: meId, sysRole } = getCurrentUser();
  const isStaff = sysRole === "STAFF" || sysRole === "ADMIN";

  const [item, setItem] = useState<NewsRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [doing, setDoing] = useState<string | null>(null);

  // edit state
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(""); // URL hiện đang lưu ở server
  const [newsType, setNewsType] = useState("");
  const [reason, setReason] = useState("");

  // chọn ảnh từ máy (xem trước, dùng DATA URL để tránh blob:)
  const [filePreviewDataUrl, setFilePreviewDataUrl] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const rs = await requestsApi.getDetail(id);
        const data = rs.data as unknown as NewsRequest;
        setItem(data);
        setTitle(data.requestTitle || "");
        setContent(data.description || "");
        setThumbnailUrl(data.thumbnailUrl || "");
        setNewsType(data.newsType || "");
      } catch (e: any) {
        setErr(e?.message || "Không tải được request.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ✅ Auto mở form sửa nếu ?edit=1 và có quyền
  useEffect(() => {
    if (!item) return;
    const wantEdit = searchParams.get("edit") === "1";
    const isCreator = !!meId && !!item.createdByUserId && meId === item.createdByUserId;
    const isPendingClub = item.status === "PENDING_CLUB";
    const isPendingUni  = item.status === "PENDING_UNIVERSITY";
    const isCanceled    = item.status === "CANCELED";
    const canEditNow = isCreator && (isPendingClub || isPendingUni || isCanceled);

    if (wantEdit && canEditNow) {
      setEditing(true);
      // xoá cờ edit cho sạch URL
      const sp = new URLSearchParams(searchParams);
      sp.delete("edit");
      setSearchParams(sp, { replace: true });
    }
  }, [item, meId, searchParams, setSearchParams]);

  const goBack = () => {
    if (Number.isFinite(teamIdOnUrl) && Number.isFinite(clubId)) {
      nav(`/myclub/${clubId}/teams/${teamIdOnUrl}?tab=requests`);
    } else if (Number.isFinite(clubId)) {
      nav(`/myclub/${clubId}/news?tab=requests`);
    } else {
      nav(-1);
    }
  };

  if (loading)
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* HERO SKELETON */}
        <div className="rounded-2xl overflow-hidden bg-slate-100">
          <div className="w-full h-[340px] bg-slate-200 animate-pulse" />
        </div>

        {/* TITLE + STATUS + TYPE SKELETON */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-6 w-24 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-5 w-28 rounded-full bg-slate-200 animate-pulse" />
          </div>
          <div className="h-10 w-3/5 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
        </div>

        {/* CONTENT SKELETON */}
        <div className="grid gap-3">
          <div className="space-y-2">
            <div className="h-4 rounded bg-slate-200 w-full animate-pulse" />
            <div className="h-4 rounded bg-slate-200 w-full animate-pulse" />
            <div className="h-4 rounded bg-slate-200 w-5/6 animate-pulse" />
            <div className="h-4 rounded bg-slate-200 w-2/3 animate-pulse" />
            <div className="h-4 rounded bg-slate-200 w-4/5 animate-pulse" />
          </div>
        </div>

        {/* INFO SKELETON */}
        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-semibold text-slate-700">Thông tin</div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border p-3">
              <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
              <div className="mt-2 space-y-2">
                <div className="h-3 rounded bg-slate-200 w-full animate-pulse" />
                <div className="h-3 rounded bg-slate-200 w-5/6 animate-pulse" />
              </div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
              <div className="mt-2 space-y-2">
                <div className="h-3 rounded bg-slate-200 w-full animate-pulse" />
                <div className="h-3 rounded bg-slate-200 w-5/6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS SKELETON */}
        <div className="flex flex-col gap-2">
          <div className="h-10 w-40 rounded-lg bg-slate-200 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-36 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-10 w-36 rounded-lg bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  if (err) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-3">
        <div className="text-sm text-rose-600">{err}</div>
        <button onClick={goBack} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
      </div>
    );
  }
  if (!item) return null;

  const isCreator = !!meId && !!item.createdByUserId && meId === item.createdByUserId;
  const isPendingClub = item.status === "PENDING_CLUB";
  const isPendingUni  = item.status === "PENDING_UNIVERSITY";
  const isCanceled    = item.status === "CANCELED";

  const showClubActions =
    isPendingClub && !isStaff && !!item.teamId && !isCreator;

  const showStaffActions = isPendingUni && isStaff;

  const showCancel = isCreator && (isPendingClub || isPendingUni);
  const canEdit = isCreator && (isPendingClub || isPendingUni || isCanceled);

  const reload = async () => {
    try {
      const rs = await requestsApi.getDetail(id);
      const data = rs.data as any;
      setItem(data);
      // đồng bộ lại form (nhưng không ghi đè preview người dùng đang nhập)
      setTitle(data.requestTitle || "");
      setContent(data.description || "");
      setThumbnailUrl(data.thumbnailUrl || "");
      setNewsType(data.newsType || "");
    } catch {}
  };

  // ===== ACTIONS =====
  const clubApprove = async () => {
    if (!item) return;
    if (!confirm(`Duyệt & gửi lên Staff request #${item.id}?`)) return;
    setDoing("clubApprove");
    try {
      await requestsApi.clubApproveAndSubmit(item.id);
      await reload();
      alert("Đã duyệt & gửi lên cấp Trường.");
    } catch (e: any) {
      alert(e?.message || "Không duyệt được.");
    } finally {
      setDoing(null);
    }
  };

  const clubReject = async () => {
    if (!item) return;
    if (!reason.trim()) { alert("Nhập lý do từ chối."); return; }
    if (!confirm(`Từ chối request #${item.id}?`)) return;
    setDoing("clubReject");
    try {
      await requestsApi.clubPresidentReject(item.id, { reason: reason.trim() });
      setReason("");
      await reload();
      alert("Đã từ chối ở cấp CLB.");
    } catch (e: any) {
      alert(e?.message || "Không từ chối được.");
    } finally {
      setDoing(null);
    }
  };

  const staffApprove = async () => {
    if (!item) return;
    if (!confirm(`Staff duyệt & publish request #${item.id}?`)) return;
    setDoing("staffApprove");
    try {
      await requestsApi.staffApprovePublish(item.id, {});
      await reload();
      alert("Đã duyệt & đăng tin .");
    } catch (e: any) {
      alert(e?.message || "Không duyệt được.");
    } finally {
      setDoing(null);
    }
  };

  const staffReject = async () => {
    if (!item) return;
    if (!reason.trim()) { alert("Nhập lý do từ chối."); return; }
    if (!confirm(`Staff từ chối yêu cầu #${item.id}?`)) return;
    setDoing("staffReject");
    try {
      await requestsApi.staffReject(item.id, { reason: reason.trim() });
      setReason("");
      await reload();
      alert("Đã từ chối ở cấp Trường.");
    } catch (e: any) {
      alert(e?.message || "Không từ chối được.");
    } finally {
      setDoing(null);
    }
  };

  const cancelReq = async () => {
    if (!item) return;
    if (!confirm(`Hủy yêu cầu #${item.id}?`)) return;
    setDoing("cancel");
    try {
      await requestsApi.cancel(item.id);
      await reload();
      alert("Đã hủy yêu cầu. Bạn có thể sửa & gửi lại.");
    } catch (e: any) {
      alert(e?.message || "Không hủy được.");
    } finally {
      setDoing(null);
    }
  };

  // ====== File helpers (dùng DataURL, không blob:) ======
  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const handlePickedFile = async (f: File | undefined | null) => {
    if (!f) return;
    setFileObj(f);
    try {
      const dataUrl = await readFileAsDataUrl(f);
      setFilePreviewDataUrl(dataUrl); // ✅ preview không còn blob:
    } catch {
      alert("Không đọc được file ảnh.");
    }
  };

  // chọn ảnh bằng input
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    await handlePickedFile(f);
  };

  // kéo thả
  const onDropFile: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    await handlePickedFile(f);
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const saveEdit = async () => {
    if (!item) return;
    if (!title.trim() || !content.trim()) { alert("Thiếu tiêu đề hoặc nội dung."); return; }

    setDoing("save");
    try {
      let finalThumb = thumbnailUrl || undefined;

      // nếu user vừa chọn file mới → upload trước khi gọi update
      if (fileObj) {
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url; // backend trả url ảnh đã upload
      }

      const payload: UpdateNewsRequestPayload = {
        title,
        content,
        thumbnailUrl: finalThumb,
        newsType: newsType || undefined,
      };

      await requestsApi.update(item.id, payload);
      await reload();
      setEditing(false);

      // clear preview
      setFilePreviewDataUrl(null);
      setFileObj(null);

      alert("Đã lưu thay đổi.");
    } catch (e: any) {
      alert(e?.message || "Không lưu được.");
    } finally {
      setDoing(null);
    }
  };

  // meta line
  const isAuthorStaff = !item.clubId;
  const metaLine = isAuthorStaff ? (
    <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
      <span>Nhà Trường</span>
      {item.createdByFullName && <span>{item.createdByFullName}{item.createdByEmail ? ` (${item.createdByEmail})` : ""}</span>}
      {item.requestDate && <span>Gửi lúc {new Date(item.requestDate).toLocaleString("vi-VN")}</span>}
      {/* {item.newsId && (
        <a href={`/news/${item.newsId}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
          <Newspaper className="h-4 w-4" /> News ID: {item.newsId}
        </a>
      )} */}
    </div>
  ) : (
    <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
      {item.clubName && <span>CLB {item.clubName}</span>}
      {item.teamName && <span>Phòng ban {item.teamName}</span>}
      {item.createdByFullName && <span>Bởi {item.createdByFullName}{item.createdByEmail ? ` (${item.createdByEmail})` : ""}</span>}
      {item.requestDate && <span>Gửi lúc {new Date(item.requestDate).toLocaleString("vi-VN")}</span>}
      {/* {item.newsId && (
        <a href={`/news/${item.newsId}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
          <Newspaper className="h-4 w-4" /> News ID: {item.newsId}
        </a>
      )} */}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex justify-end">
        <button onClick={goBack} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
      </div>

      {/* HERO THUMBNAIL */}
      <div className="rounded-2xl overflow-hidden bg-slate-100">
        {(filePreviewDataUrl || thumbnailUrl) ? (
          <img
            src={filePreviewDataUrl || thumbnailUrl}
            alt={item.requestTitle || "thumbnail"}
            className="w-full h-[340px] object-cover"
          />
        ) : (
          <div className="w-full h-[220px] bg-gradient-to-br from-slate-100 to-slate-200" />
        )}
      </div>

      {/* TITLE + STATUS + TYPE */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={badgeClass(item.status)}>{(item.status as RequestStatus) || "—"}</span>
          {item.newsType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
              <Tag className="h-3.5 w-3.5" /> {item.newsType}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight leading-snug">{item.requestTitle || "—"}</h1>
        {metaLine}
      </div>

      {/* CONTENT or EDIT FORM */}
      {editing ? (
        <div className="grid gap-3">
          <input
            className="border rounded p-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề"
          />
          <textarea
            className="border rounded p-2 w-full min-h-[220px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nội dung"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            {/* ✅ Thay input newsType bằng Select có prefill */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Loại bản tin</label>
              <Select value={newsType || undefined} onValueChange={(v) => setNewsType(v)}>
                <SelectTrigger className="w-full rounded-lg border px-3 py-2">
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
            </div>

            {/* Khu chọn ảnh: kéo-thả hoặc chọn file; không cho dán link */}
            <div
              className="rounded-lg border border-dashed p-3 flex items-center justify-between gap-3"
              onDrop={onDropFile}
              onDragOver={onDragOver}
              onPaste={(e) => {
                // chặn dán link
                if (e.clipboardData?.getData("text/plain")) {
                  e.preventDefault();
                }
              }}
            >
              <div className="text-sm text-slate-600">
                <div className="font-medium">Ảnh bìa</div>
                <div className="text-xs text-slate-500">
                  Kéo-thả ảnh vào đây hoặc chọn file. (Không dán link)
                </div>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50 cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                Chọn ảnh
                <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={doing === "save"}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {doing === "save" ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setFilePreviewDataUrl(null);
                setFileObj(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
            >
              Hủy chỉnh sửa
            </button>
          </div>
        </div>
      ) : (
        <article className="prose max-w-none leading-relaxed whitespace-pre-wrap">{item.description || "—"}</article>
      )}

      {/* INFO */}
      <div className="border-t pt-4 space-y-3">
        <div className="text-sm font-semibold text-slate-700">Thông tin</div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Phản hồi / Ghi chú" value={item.responseMessage || "—"} />
          {/* {item.newsId ? (
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-slate-500">Bản tin đính kèm</div>
              <a href={`/news/${item.newsId}`} className="mt-0.5 inline-flex items-center gap-1 text-indigo-600 hover:underline">
                <Newspaper className="h-4 w-4" /> News ID: {item.newsId}
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-slate-500">Bản tin đính kèm</div>
              <div className="mt-0.5">—</div>
            </div>
          )} */}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col gap-2">
        {/* Chủ nhiệm CLB */}
        {showClubActions && (
          <>
            <button onClick={clubApprove} disabled={doing === "clubApprove"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700 disabled:opacity-60">
              <CheckCircle2 className="h-4 w-4" /> {doing === "clubApprove" ? "Đang duyệt…" : "Duyệt & gửi lên Staff"}
            </button>
            <div className="flex gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do từ chối…" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
              <button onClick={clubReject} disabled={doing === "clubReject"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 text-white px-3 py-2 hover:bg-rose-700 disabled:opacity-60">
                <XCircle className="h-4 w-4" /> {doing === "clubReject" ? "Đang từ chối…" : "Từ chối (Chủ nhiệm)"}
              </button>
            </div>
          </>
        )}

        {/* Staff/Admin */}
        {showStaffActions && (
          <>
            <button onClick={staffApprove} disabled={doing === "staffApprove"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700 disabled:opacity-60">
              <CheckCircle2 className="h-4 w-4" /> {doing === "staffApprove" ? "Đang duyệt…" : "Duyệt & publish"}
            </button>
            <div className="flex gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do từ chối…" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
              <button onClick={staffReject} disabled={doing === "staffReject"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 text-white px-3 py-2 hover:bg-rose-700 disabled:opacity-60">
                <XCircle className="h-4 w-4" /> {doing === "staffReject" ? "Đang từ chối…" : "Từ chối (Staff)"}
              </button>
            </div>
          </>
        )}

        {/* Creator: Hủy / Sửa */}
        <div className="flex flex-col sm:flex-row gap-2">
          {showCancel && (
            <button onClick={cancelReq} disabled={doing === "cancel"} className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50 disabled:opacity-60">
              <Ban className="h-4 w-4" /> {doing === "cancel" ? "Đang hủy…" : "Hủy request"}
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50">
              <Pencil className="h-4 w-4" /> Sửa yêu cầu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
