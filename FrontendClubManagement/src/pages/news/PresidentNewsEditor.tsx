// src/pages/news/PresidentNewsEditor.tsx
"use client";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Skeleton from "@/components/common/Skeleton";
import { draftsApi } from "@/api/newsDrafts";
import { requestsApi } from "@/api/newsRequests";
import { uploadImageOnly } from "@/api/uploads";
import type { NewsData, RequestStatus } from "@/types/news";
import { ArrowLeft, Tag, Loader2, Image as ImageIcon } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

/** Danh sách loại tin (giống các nơi khác) */
const NEWS_TYPES = [
  { value: "Tin chung", label: "Tin chung" },
  { value: "Sự kiện", label: "Sự kiện" },
  { value: "Thành tích", label: "Thành tích" },
  { value: "Tuyển thành viên", label: "Tuyển thành viên" },
  { value: "Lập trình", label: "Lập trình" },
  { value: "Thể Thao", label: "Thể Thao" },
] as const;

/** Đọc file thành DataURL để preview (đồng bộ với RequestDetail) */
const readAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

export default function PresidentNewsEditor() {
  const nav = useNavigate();
  const { clubId: clubIdParam } = useParams();
  const clubId = Number(clubIdParam);
  const location = useLocation() as { state?: { draft?: NewsData } };

  // ===== state =====
  const [draftId, setDraftId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(""); // URL thật (server)
  const [newsType, setNewsType] = useState("");
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(false);

  // Ảnh mới (giống RequestDetail): preview DataURL + file để upload
  const [thumbPreview, setThumbPreview] = useState<string>(""); // DataURL hoặc URL cũ
  const [fileObj, setFileObj] = useState<File | null>(null);

  // validation / touched (giống tinh thần bên RequestDetail)
  const [touched, setTouched] = useState<{ title?: boolean; content?: boolean }>({});
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Vui lòng nhập tiêu đề.";
    if (!content.trim()) e.content = "Vui lòng nhập nội dung.";
    return e;
  }, [title, content]);

  // ===== đọc draftId từ URL =====
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const did = Number(p.get("draftId"));
    setDraftId(Number.isFinite(did) ? did : null);
  }, []);

  // ===== prefill từ state hoặc API (giống RequestDetail) =====
  useEffect(() => {
    const load = async () => {
      if (location.state?.draft) {
        const d = location.state.draft;
        setTitle(d.title || "");
        setContent(d.content || "");
        setThumbnailUrl(d.thumbnailUrl || "");
        setThumbPreview(d.thumbnailUrl || "");
        setNewsType(d.newsType || "");
        setLoading(false);
        return;
      }
      if (!draftId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await draftsApi.get(draftId);
        const d = (res as any)?.data as NewsData | undefined;
        if (d) {
          setTitle(d.title || "");
          setContent(d.content || "");
          setThumbnailUrl(d.thumbnailUrl || "");
          setThumbPreview(d.thumbnailUrl || "");
          setNewsType(d.newsType || "");
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };

    // start loading when effect runs
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, location.state]);

  const markTouched = (k: keyof typeof touched) =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const validateBeforeSubmit = () => {
    setTouched({ title: true, content: true });
    if (!Number.isFinite(clubId)) {
      alert("Thiếu clubId trên URL");
      return false;
    }
    if (Object.keys(errors).length > 0) return false;
    return true;
  };

  // ===== actions (giữ logic cũ, nhưng UI giống RequestDetail) =====
  const saveDraft = async () => {
    if (!validateBeforeSubmit()) return;
    setSaving(true);
    try {
      let finalThumb = thumbnailUrl || undefined;
      if (fileObj) {
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
        setThumbnailUrl(up.url);
      }

      if (draftId) {
        const res = await draftsApi.update(draftId, {
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType: newsType || undefined,
        });
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Update draft failed");
        alert(`Đã cập nhật nháp #${res.data.id}`);
      } else {
        const res = await draftsApi.create({
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType: newsType || undefined,
          clubId,
        } as any);
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Create draft failed");
        alert(`Đã lưu nháp #${res.data.id}`);
      }
      nav(`/myclub/${clubId}/news?tab=drafts`);
    } catch (e: any) {
      alert(e?.message || "Không lưu được nháp");
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async () => {
    if (!validateBeforeSubmit()) return;
    setSaving(true);
    try {
      let finalThumb = thumbnailUrl || undefined;
      if (fileObj) {
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
        setThumbnailUrl(up.url);
      }

      if (draftId) {
        const res = await draftsApi.submit(draftId);
        if (res.code !== 200) throw new Error(res.message || "Submit draft failed");
        const payload = res.data as { requestId: number; status: RequestStatus };
        alert(`Đã submit nháp #${draftId} → request #${payload?.requestId}`);
      } else {
        const res = await requestsApi.create({
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType: newsType || undefined,
          clubId,
        });
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Create request failed");
        alert(`Đã tạo request #${res.data.id}`);
      }
      nav(`/myclub/${clubId}/news?tab=requests`);
    } catch (e: any) {
      alert(e?.message || "Không submit được request");
    } finally {
      setSaving(false);
    }
  };

  // ===== UI helpers =====
  const goBack = () => nav(-1);
  const metaClub = Number.isFinite(clubId) ? `CLB #${clubId}` : "—";
  const todayVN = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24 space-y-6">
      {loading ? (
        <div className="max-w-6xl mx-auto p-4 pb-24 space-y-6">
          <div className="rounded-2xl overflow-hidden bg-slate-100">
            <Skeleton width="100%" height={220} />
          </div>

          <div className="space-y-2">
            <Skeleton width="60%" height={36} />
          </div>

          <div className="grid gap-3">
            <Skeleton width="100%" height={36} />
            <Skeleton width="100%" height={220} />
            <div className="grid sm:grid-cols-2 gap-3">
              <Skeleton width={220} height={36} />
              <Skeleton width={220} height={104} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Skeleton width={140} height={40} />
            <Skeleton width={140} height={40} />
            <Skeleton width={120} height={40} />
          </div>
        </div>
      ) : null}
      {/* Header giống RequestDetail */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50"
          type="button"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
        <div className="text-sm text-slate-500">
          {draftId ? `Sửa nháp #${draftId}` : "Tạo bài mới"}
        </div>
      </div>

      {/* HERO THUMBNAIL (preview bằng DataURL giống hệt RequestDetail) */}
      <div className="rounded-2xl overflow-hidden bg-slate-100">
        {(thumbPreview || thumbnailUrl) ? (
          <img
            src={thumbPreview || thumbnailUrl}
            alt="thumbnail"
            className="w-full h-[340px] object-cover"
            onError={() => { setThumbPreview(""); setThumbnailUrl(""); }}
          />
        ) : (
          <div className="w-full h-[220px] bg-gradient-to-br from-slate-100 to-slate-200" />
        )}
      </div>

      {/* META giống RequestDetail */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap text-sm text-slate-500">
          <span>{metaClub}</span>
          <span>•</span>
          <span>{todayVN}</span>
          {newsType && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
                <Tag className="h-3.5 w-3.5" /> {newsType}
              </span>
            </>
          )}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight leading-snug">
          {title.trim() ? title : "Tiêu đề bài viết"}
        </h1>
      </div>

      {/* FORM (layout và tương tác như khi “Sửa yêu cầu” ở RequestDetail) */}
      <div className="grid gap-3">
        {/* Title */}
        <input
          className={`border rounded p-2 w-full text-[15px] ${touched.title && errors.title ? "border-rose-500" : "border-slate-300"}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => markTouched("title")}
          placeholder="Tiêu đề"
        />
        {touched.title && errors.title ? (
          <p className="text-xs text-rose-600 -mt-1">* {errors.title}</p>
        ) : null}

        {/* Content */}
        <textarea
          className={`border rounded p-2 w-full min-h-[220px] text-[15px] leading-6 ${touched.content && errors.content ? "border-rose-500" : "border-slate-300"}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => markTouched("content")}
          placeholder="Nội dung"
        />
        {touched.content && errors.content ? (
          <p className="text-xs text-rose-600 -mt-1">* {errors.content}</p>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-3">
          {/* News Type Select */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Loại bản tin</div>
            <Select value={newsType || undefined} onValueChange={(v) => setNewsType(v)}>
              <SelectTrigger className="w-full px-3 py-2 rounded-lg border">
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
            <p className="mt-1 text-xs text-slate-500">Không bắt buộc.</p>
          </div>

          {/* Drop-zone ảnh: drag-drop, chặn dán link (giống RequestDetail) */}
          <div
            className="rounded-lg border border-dashed p-3 flex items-center justify-between gap-3"
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const f = e.dataTransfer.files?.[0];
              if (!f || !f.type.startsWith("image/")) return;
              const dataUrl = await readAsDataURL(f);
              setFileObj(f);
              setThumbPreview(dataUrl);
            }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onPaste={(e) => {
              // chặn dán link text vào
              if (e.clipboardData?.getData("text/plain")) e.preventDefault();
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
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f || !f.type.startsWith("image/")) return;
                  const dataUrl = await readAsDataURL(f);
                  setFileObj(f);
                  setThumbPreview(dataUrl);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Action bar (giống tinh thần RequestDetail: Lưu / Hủy / Submit) */}
      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={saveDraft}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {draftId ? "Cập nhật nháp" : "Lưu bản nháp"}
        </button>
        <button
          onClick={submitRequest}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {draftId ? "Lưu bản nháp" : "Gửi yêu cầu"}
        </button>
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
