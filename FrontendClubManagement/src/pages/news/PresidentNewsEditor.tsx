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

/* ===== Constants ===== */
const NEWS_TYPES = [
  { value: "Tin chung", label: "Tin chung" },
  { value: "Sự kiện", label: "Sự kiện" },
  { value: "Thành tích", label: "Thành tích" },
  { value: "Tuyển thành viên", label: "Tuyển thành viên" },
  { value: "Lập trình", label: "Lập trình" },
  { value: "Thể Thao", label: "Thể Thao" },
] as const;

const LIMITS = {
  titleMax: 120,
  contentMax: 5000,
  imageMaxMB: 5,
} as const;

const ALLOW_TYPES: ReadonlySet<string> = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);
/* ===== Helpers ===== */
const readAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

function validateImageFile(file: File): string | null {
  if (!ALLOW_TYPES.has(file.type)) return "Ảnh phải là JPG/PNG/WEBP.";
  const mb = file.size / (1024 * 1024);
  if (mb > LIMITS.imageMaxMB)
    return `Kích thước tối đa ${LIMITS.imageMaxMB}MB. Ảnh hiện tại ~${mb.toFixed(1)}MB.`;
  return null;
}

/* ===== Main Component ===== */
export default function PresidentNewsEditor() {
  const nav = useNavigate();
  const { clubId: clubIdParam } = useParams();
  const clubId = Number(clubIdParam);
  const location = useLocation() as { state?: { draft?: NewsData } };

  const [draftId, setDraftId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [newsType, setNewsType] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [thumbPreview, setThumbPreview] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);

  const [touched, setTouched] = useState<{ title?: boolean; content?: boolean; type?: boolean; image?: boolean }>({});
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Vui lòng nhập tiêu đề.";
    if (!content.trim()) e.content = "Vui lòng nhập nội dung.";
    if (!newsType) e.type = "Vui lòng chọn loại bản tin.";
    if (!(thumbPreview || thumbnailUrl)) e.image = "Vui lòng chọn ảnh bìa.";
    return e;
  }, [title, content, newsType, thumbPreview, thumbnailUrl]);

  const markTouched = (k: keyof typeof touched) =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const did = Number(p.get("draftId"));
    setDraftId(Number.isFinite(did) ? did : null);
  }, []);

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
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [draftId, location.state]);

  const validateBeforeSubmit = () => {
    setTouched({ title: true, content: true, type: true, image: true });
    if (!Number.isFinite(clubId)) {
      alert("Thiếu clubId trên URL");
      return false;
    }
    return Object.keys(errors).length === 0;
  };

  const saveDraft = async () => {
    if (!validateBeforeSubmit()) return;
    setSaving(true);
    try {
      let finalThumb = thumbnailUrl;
      if (fileObj) {
        const err = validateImageFile(fileObj);
        if (err) {
          alert(err);
          setSaving(false);
          return;
        }
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
      }

      if (draftId) {
        const res = await draftsApi.update(draftId, { title, content, thumbnailUrl: finalThumb, newsType });
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Update draft failed");
        alert(`Đã cập nhật nháp #${res.data.id}`);
      } else {
        const res = await draftsApi.create({ title, content, thumbnailUrl: finalThumb, newsType, clubId } as any);
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
      let finalThumb = thumbnailUrl;
      if (fileObj) {
        const err = validateImageFile(fileObj);
        if (err) {
          alert(err);
          setSaving(false);
          return;
        }
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
      }

      if (draftId) {
        const res = await draftsApi.submit(draftId);
        if (res.code !== 200) throw new Error(res.message || "Submit draft failed");
        const payload = res.data as { requestId: number; status: RequestStatus };
        alert(`Đã submit nháp #${draftId} → request #${payload?.requestId}`);
      } else {
        const res = await requestsApi.create({ title, content, thumbnailUrl: finalThumb, newsType, clubId });
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

  const goBack = () => nav(-1);
  const metaClub = Number.isFinite(clubId) ? `CLB #${clubId}` : "—";
  const todayVN = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24 space-y-6">
      {loading && (
        <div className="space-y-6">
          <Skeleton width="100%" height={220} />
          <Skeleton width="60%" height={36} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={goBack} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
        <div className="text-sm text-slate-500">
          {draftId ? `Sửa nháp #${draftId}` : "Tạo bài mới"}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-slate-100">
        {(thumbPreview || thumbnailUrl) ? (
          <img
            src={thumbPreview || thumbnailUrl}
            alt="thumbnail"
            className="w-full h-[340px] object-cover"
            onError={() => {
              setThumbPreview("");
              setThumbnailUrl("");
            }}
          />
        ) : (
          <div className="w-full h-[220px] bg-gradient-to-br from-slate-100 to-slate-200" />
        )}
      </div>
      {touched.image && errors.image && <p className="text-xs text-rose-600 mt-1">* {errors.image}</p>}

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

      {/* === Form === */}
      <div className="grid gap-3">
        <div>
          <input
            className={`w-full px-4 py-2.5 rounded-lg border ${touched.title && errors.title ? "border-rose-300" : "border-slate-300"}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => markTouched("title")}
            placeholder="Tiêu đề"
          />
          {touched.title && errors.title && <p className="text-xs text-rose-600 mt-1">* {errors.title}</p>}
        </div>

        <div>
          <textarea
            className={`w-full px-4 py-2.5 rounded-lg border resize-none min-h-[220px] ${touched.content && errors.content ? "border-rose-300" : "border-slate-300"}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => markTouched("content")}
            placeholder="Nội dung"
          />
          {touched.content && errors.content && <p className="text-xs text-rose-600 mt-1">* {errors.content}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Loại bản tin</div>
            <Select value={newsType || undefined} onValueChange={(v) => setNewsType(v)}>
              <SelectTrigger className={`w-full px-3 py-2 rounded-lg border ${touched.type && errors.type ? "border-rose-300" : "border-slate-300"}`}>
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
            {touched.type && errors.type && <p className="text-xs text-rose-600 mt-1">* {errors.type}</p>}
          </div>

          {/* Drop-zone ảnh */}
          <div
            className={`rounded-lg border border-dashed p-3 flex items-center justify-between gap-3 ${touched.image && errors.image ? "border-rose-300" : "border-slate-300"}`}
            onDrop={async (e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (!f || !f.type.startsWith("image/")) return;
              const err = validateImageFile(f);
              if (err) {
                alert(err);
                return;
              }
              const dataUrl = await readAsDataURL(f);
              setFileObj(f);
              setThumbPreview(dataUrl);
              markTouched("image");
            }}
            onDragOver={(e) => e.preventDefault()}
            onPaste={(e) => {
              if (e.clipboardData?.getData("text/plain")) e.preventDefault();
            }}
          >
            <div className="text-sm text-slate-600">
              <div className="font-medium">Ảnh bìa</div>
              <div className="text-xs text-slate-500">Kéo-thả ảnh hoặc chọn file (Không dán link)</div>
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50 cursor-pointer">
              <ImageIcon className="h-4 w-4" /> Chọn ảnh
              <input
                type="file"
                accept={[...ALLOW_TYPES].join(",")}
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const err = validateImageFile(f);
                  if (err) {
                    alert(err);
                    return;
                  }
                  const dataUrl = await readAsDataURL(f);
                  setFileObj(f);
                  setThumbPreview(dataUrl);
                  markTouched("image");
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* === Actions === */}
      <div className="flex gap-2 pt-2 border-t">
        <button onClick={saveDraft} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {draftId ? "Cập nhật nháp" : "Lưu bản nháp"}
        </button>

        <button onClick={submitRequest} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Gửi yêu cầu
        </button>

        <button onClick={goBack} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50">
          Hủy
        </button>
      </div>
    </div>
  );
}