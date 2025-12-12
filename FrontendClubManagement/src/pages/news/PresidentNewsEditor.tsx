"use client";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Skeleton from "@/components/common/Skeleton";
import { draftsApi } from "@/api/newsDrafts";
import { requestsApi } from "@/api/newsRequests";
import { uploadImageOnly } from "@/api/uploads";
import type { NewsData, RequestStatus } from "@/types/news";
import { toast } from "sonner"; // ⭐ THÊM toast
import {
  ArrowLeft,
  Tag,
  Loader2,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

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
    return `Kích thước tối đa ${LIMITS.imageMaxMB}MB. Ảnh hiện tại ~${mb.toFixed(
      1
    )}MB.`;
  return null;
}

type FormErrors = {
  title?: string;
  content?: string;
  newsType?: string;
  thumbnailUrl?: string;
};

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
  const [loading, setLoading] = useState(true);
  const [thumbPreview, setThumbPreview] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  /* ===== Load draftId ===== */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const did = Number(p.get("draftId"));
    setDraftId(Number.isFinite(did) ? did : null);
  }, []);

  /* ===== Load draft data ===== */
  useEffect(() => {
    const fillFrom = (d?: NewsData) => {
      setTitle(d?.title || "");
      setContent(d?.content || "");
      setThumbnailUrl(d?.thumbnailUrl || "");
      setThumbPreview(d?.thumbnailUrl || "");
      setNewsType(d?.newsType || "");
    };

    const load = async () => {
      try {
        if (location.state?.draft) {
          fillFrom(location.state.draft);
          return;
        }
        if (!draftId) return;
        const res = await draftsApi.get(draftId);
        const d = (res as any)?.data as NewsData | undefined;
        fillFrom(d);
      } catch {}
    };

    (async () => {
      await load();
      setLoading(false);
    })();
  }, [draftId, location.state]);

  /* ===== Validate ===== */
  const validate = () => {
    if (!Number.isFinite(clubId)) {
      toast.error("Thiếu clubId trên URL");
      return false;
    }

    const next: FormErrors = {};
    if (!title.trim()) next.title = "Bạn chưa nhập tiêu đề";
    if (!content.trim()) next.content = "Bạn chưa nhập nội dung";
    if (!newsType.trim()) next.newsType = "Bạn chưa chọn loại tin";
    // if (!(thumbPreview || thumbnailUrl))
    //   next.thumbnailUrl = "Bạn chưa chọn ảnh bìa";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /* ===== Actions ===== */
  const saveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let finalThumb = thumbnailUrl;

      if (fileObj) {
        const err = validateImageFile(fileObj);
        if (err) {
          toast.error(err);
          setSaving(false);
          return;
        }
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
        setThumbnailUrl(up.url);
      }

      if (draftId) {
        const res = await draftsApi.update(draftId, {
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType,
        });
        if (res.code !== 200 || !res.data)
          throw new Error(res.message || "Không thể cập nhật nháp");
        toast.success(`Đã cập nhật bản nháp thành công`);
      } else {
        const res = await draftsApi.create({
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType,
          clubId,
        } as any);
        if (res.code !== 200 || !res.data)
          throw new Error(res.message || "Không thể tạo nháp");
        toast.success(`Đã lưu bản nháp thành công`);
      }

      nav(`/myclub/${clubId}/news?tab=drafts`);
    } catch (e: any) {
      toast.error(e?.message || "Lưu nháp thất bại");
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let finalThumb = thumbnailUrl;

      if (fileObj) {
        const err = validateImageFile(fileObj);
        if (err) {
          toast.error(err);
          setSaving(false);
          return;
        }
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
        setThumbnailUrl(up.url);
      }

      if (draftId) {
        const res = await draftsApi.submit(draftId);
        if (res.code !== 200)
          throw new Error(res.message || "Không thể gửi yêu cầu");

        const payload = res.data as {
          requestId: number;
          status: RequestStatus;
        };
        toast.success(`Đã gửi nháp  → yêu cầu `);
        void payload;
      } else {
        const res = await requestsApi.create({
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType,
          clubId,
        });
        if (res.code !== 200 || !res.data)
          throw new Error(res.message || "Không thể tạo yêu cầu");
        toast.success(`Đã tạo yêu cầu xét duyệt thành công`);
      }

      nav(`/myclub/${clubId}/news?tab=requests`);
    } catch (e: any) {
      toast.error(e?.message || "Gửi yêu cầu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => nav(-1);

  /* ===== Date / Club meta ===== */
  const metaClub = Number.isFinite(clubId) ? `CLB #${clubId}` : "—";
  const todayVN = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  /* ===== Loading skeleton ===== */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton width={120} height={32} />
          <Skeleton width={160} height={20} />
        </div>
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold">Ảnh bìa</label>
            <div className="rounded-2xl overflow-hidden bg-slate-100">
              <Skeleton width="100%" height={220} />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold">Tiêu đề</label>
            <Skeleton width="100%" height={36} />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold">Loại tin</label>
            <Skeleton width={220} height={36} />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold">Nội dung</label>
            <Skeleton width="100%" height={280} />
          </div>
        </div>
        <div className="flex gap-3 pt-6 border-t">
          <Skeleton width={160} height={44} />
          <Skeleton width={160} height={44} />
          <Skeleton width={120} height={44} />
        </div>
      </div>
    );
  }

  /* ===== UI ===== */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>

        <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 flex-wrap justify-end">
          <span>{metaClub}</span>
          <span>•</span>
          <span>{todayVN}</span>
          {newsType && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
                <Tag className="h-3.5 w-3.5" /> {newsType}
              </span>
            </>
          )}
          {draftId && (
            <>
              <span>•</span>
              <span className="text-xs text-slate-400">
                Đang sửa nháp #{draftId}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="space-y-3">
        <label className="text-sm font-semibold">Ảnh bìa</label>
        <DropImagePreview
          preview={thumbPreview || thumbnailUrl}
          onPick={async (file, dataUrl) => {
            const err = validateImageFile(file);
            if (err) {
              toast.error(err);
              return;
            }
            setFileObj(file);
            setThumbPreview(dataUrl);
            if (errors.thumbnailUrl)
              setErrors((x) => ({ ...x, thumbnailUrl: undefined }));
          }}
          onClear={() => {
            setFileObj(null);
            setThumbPreview("");
            setThumbnailUrl("");
          }}
          errorMsg={errors.thumbnailUrl}
        />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Tiêu đề</label>
        <input
          className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 ${
            errors.title
              ? "border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:ring-blue-500"
          }`}
          placeholder="Nhập tiêu đề tin tức"
          value={title}
          maxLength={LIMITS.titleMax}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((x) => ({ ...x, title: undefined }));
          }}
        />
        {errors.title && (
          <p className="text-rose-600 text-xs">{errors.title}</p>
        )}
      </div>

      {/* News type */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Loại tin</label>
        <Select
          value={newsType || undefined}
          onValueChange={(v) => {
            setNewsType(v);
            if (errors.newsType)
              setErrors((x) => ({ ...x, newsType: undefined }));
          }}
        >
          <SelectTrigger
            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
              errors.newsType
                ? "border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:ring-blue-500"
            }`}
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
        {errors.newsType && (
          <p className="text-rose-600 text-xs">{errors.newsType}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Nội dung</label>
        <textarea
          className={`w-full border rounded-lg p-3 min-h-[280px] focus:outline-none focus:ring-2 ${
            errors.content
              ? "border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:ring-blue-500"
          }`}
          placeholder="Nhập nội dung tin tức"
          value={content}
          maxLength={LIMITS.contentMax}
          onChange={(e) => {
            setContent(e.target.value);
            if (errors.content)
              setErrors((x) => ({ ...x, content: undefined }));
          }}
        />
        {errors.content && (
          <p className="text-rose-600 text-xs">{errors.content}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          onClick={saveDraft}
          className="px-6 py-3 rounded-lg bg-gray-900 text-white font-medium disabled:opacity-50 hover:bg-gray-800 transition"
          disabled={saving}
        >
          {saving && (
            <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
          )}
          {draftId ? "Cập nhật nháp" : "Lưu bản nháp"}
        </button>

        <button
          onClick={submitRequest}
          className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 hover:bg-indigo-700 transition"
          disabled={saving}
        >
          {saving && (
            <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
          )}
          Gửi yêu cầu
        </button>

        <button
          onClick={goBack}
          className="px-6 py-3 rounded-lg border hover:bg-slate-50 transition"
          disabled={saving}
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

/* ===== Drop-zone preview ===== */
function DropImagePreview({
  preview,
  onPick,
  onClear,
  errorMsg,
}: {
  preview?: string;
  onPick: (file: File, dataUrl: string) => void;
  onClear: () => void;
  errorMsg?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasImage = Boolean(preview);

  const open = () => inputRef.current?.click();

  const handleFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await readAsDataURL(file);
    onPick(file, dataUrl);
  };

  return (
    <div>
      <div
        className={`relative rounded-lg border-2 border-dashed transition-all ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : errorMsg
              ? "border-rose-500 bg-rose-50/40"
              : "border-slate-300 bg-slate-50"
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
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <ImageIcon className="h-5 w-5 mr-2" /> Kéo-thả hoặc bấm để chọn
              ảnh
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={open}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm font-medium"
          >
            <Upload className="h-4 w-4" /> Chọn ảnh
          </button>

          {hasImage && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm font-medium"
            >
              <X className="h-4 w-4" /> Xóa
            </button>
          )}
        </div>
      </div>

      {errorMsg && <p className="text-rose-600 text-xs mt-2">{errorMsg}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          await handleFile(f || undefined);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
