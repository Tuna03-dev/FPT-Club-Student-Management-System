"use client";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { draftsApi } from "@/api/newsDrafts";
import { requestsApi } from "@/api/newsRequests";
import { uploadImageOnly } from "@/api/uploads";
import { useTeamLeadGuard } from "@/hooks/useTeamLeadGuard";
import { toast } from "sonner"; // ⭐ THÊM toast
import type { NewsData, RequestStatus } from "@/types/news";
import { ArrowLeft, Send, Loader2, ImageIcon, Upload, X } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const NEWS_TYPES = [
  { value: "Tin chung", label: "Tin chung" },
  { value: "Sự kiện", label: "Sự kiện" },
  { value: "Thành tích", label: "Thành tích" },
  { value: "Tuyển thành viên", label: "Tuyển thành viên" },
  { value: "Lập trình", label: "Lập trình" },
  { value: "Thể Thao", label: "Thể Thao" },
] as const;

const LIMITS = { imageMaxMB: 5 } as const;

const ALLOW_TYPES: ReadonlySet<string> = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

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

export default function TeamNewsEditor() {
  const nav = useNavigate();
  const { clubId: clubIdParam, teamId: teamIdParam } = useParams();
  const clubId = Number(clubIdParam);
  const teamId = Number(teamIdParam);
  const { allowed, error } = useTeamLeadGuard(clubId, teamId);
  const location = useLocation() as { state?: { draft?: NewsData } };

  const [draftId, setDraftId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [newsType, setNewsType] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  /* ===== GET DRAFT ID ===== */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const did = Number(p.get("draftId"));
    setDraftId(Number.isFinite(did) ? did : null);
  }, []);

  /* ===== LOAD EXISTING DRAFT ===== */
  useEffect(() => {
    if (location.state?.draft) {
      const d = location.state.draft;
      setTitle(d.title || "");
      setContent(d.content || "");
      setThumbnailUrl(d.thumbnailUrl || "");
      setThumbPreview(d.thumbnailUrl || "");
      setNewsType(d.newsType || "");
      return;
    }

    const loadById = async () => {
      if (!draftId) return;
      try {
        const res = await draftsApi.get(draftId);
        const d = res.data as NewsData | undefined;
        if (d) {
          setTitle(d.title || "");
          setContent(d.content || "");
          setThumbnailUrl(d.thumbnailUrl || "");
          setThumbPreview(d.thumbnailUrl || "");
          setNewsType(d.newsType || "");
        }
      } catch {}
    };
    loadById();
  }, [draftId, location.state]);

  /* ===== GUARD ===== */
  if (allowed === false)
    return (
      <div className="p-6 text-sm text-destructive">
        Bạn không có quyền truy cập. {error}
      </div>
    );
  if (allowed === null)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Đang kiểm tra quyền…
      </div>
    );

  /* ===== VALIDATION ===== */
  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!title.trim()) next.title = "Bạn chưa nhập tiêu đề";
    if (!content.trim()) next.content = "Bạn chưa nhập nội dung";
    if (!newsType.trim()) next.newsType = "Bạn chưa chọn loại bài viết";
    // if (!(thumbPreview || thumbnailUrl))
    //   next.thumbnailUrl = "Bạn chưa chọn ảnh thumbnail";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /* ===== SAVE DRAFT ===== */
  const saveDraft = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      let finalThumb = thumbnailUrl || undefined;

      if (fileObj) {
        const err = validateImageFile(fileObj);
        if (err) {
          toast.error(err);
          setSaving(false);
          return;
        }
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
      }

      if (draftId) {
        const res = await draftsApi.update(draftId, {
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType: newsType || undefined,
        });
        if (res.code !== 200 || !res.data)
          throw new Error(res.message || "Không thể cập nhật bản nháp");

        toast.success(`Đã cập nhật bản nháp thành công`);
      } else {
        const res = await draftsApi.create({
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType: newsType || undefined,
          clubId,
          teamId,
        } as any);
        if (res.code !== 200 || !res.data)
          throw new Error(res.message || "Không thể tạo bản nháp");

        toast.success(`Đã lưu bản nháp thành công`);
      }

      nav(`/myclub/${clubId}/teams/${teamId}/team-news`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Lưu bản nháp thất bại");
    } finally {
      setSaving(false);
    }
  };

  /* ===== SUBMIT REQUEST ===== */
  const submitRequest = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      if (draftId) {
        const res = await draftsApi.submit(draftId);
        if (res.code !== 200)
          throw new Error(res.message || "Không thể gửi yêu cầu xét duyệt");

        const payload = res.data as {
          requestId: number;
          status: RequestStatus;
        };
        toast.success(`Đã gửi bản nháp → yêu cầu xét duyệt `);
        void payload;
      } else {
        let finalThumb = thumbnailUrl || undefined;

        if (fileObj) {
          const err = validateImageFile(fileObj);
          if (err) {
            toast.error(err);
            setSaving(false);
            return;
          }
          const up = await uploadImageOnly(fileObj);
          finalThumb = up.url;
        }

        const res = await requestsApi.create({
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType: newsType || undefined,
          clubId,
          teamId,
        });

        if (res.code !== 200 || !res.data)
          throw new Error(res.message || "Không thể tạo yêu cầu");

        toast.success(`Đã tạo yêu cầu xét duyệt`);
      }

      nav(`/myclub/${clubId}/teams/${teamId}/team-news`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Gửi yêu cầu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => nav(-1);

  /* ===== UI ===== */
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {draftId ? `Sửa nháp #${draftId}` : "Tạo bài viết mới"}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            {draftId ? "Sửa bản nháp" : "Soạn bài viết mới"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý nội dung tin tức cho đội của bạn
          </p>
        </div>

        <div className="space-y-6 pb-32">
          {/* Thumbnail */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Ảnh thumbnail</label>
            <DropImagePreview
              preview={thumbPreview || thumbnailUrl}
              onPick={(file, dataUrl) => {
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
            <label className="text-sm font-medium text-foreground">
              Tiêu đề
            </label>
            <input
              className={`w-full px-4 py-2.5 rounded-lg border bg-background placeholder:text-muted-foreground ${
                errors.title ? "border-rose-500" : "border-border"
              }`}
              placeholder="Nhập tiêu đề bài viết"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title)
                  setErrors((x) => ({ ...x, title: undefined }));
              }}
            />
            {errors.title && (
              <p className="text-rose-600 text-xs">{errors.title}</p>
            )}
          </div>

          {/* News type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Loại bài viết
            </label>
            <Select
              value={newsType || undefined}
              onValueChange={(v) => {
                setNewsType(v);
                if (errors.newsType)
                  setErrors((x) => ({ ...x, newsType: undefined }));
              }}
            >
              <SelectTrigger
                className={`w-full px-4 py-2.5 rounded-lg border bg-background ${
                  errors.newsType ? "border-rose-500" : "border-border"
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
            <label className="text-sm font-medium text-foreground">
              Nội dung
            </label>
            <textarea
              className={`w-full px-4 py-2.5 rounded-lg border bg-background placeholder:text-muted-foreground resize-none min-h-[200px] ${
                errors.content ? "border-rose-500" : "border-border"
              }`}
              placeholder="Viết nội dung bài viết của bạn"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content)
                  setErrors((x) => ({ ...x, content: undefined }));
              }}
              rows={10}
            />
            {errors.content && (
              <p className="text-rose-600 text-xs">{errors.content}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-border bg-background backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {draftId ? `Chỉnh sửa nháp #${draftId}` : "Bản nháp mới"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {draftId ? "Cập nhật" : "Lưu nháp"}
            </button>
            <button
              onClick={submitRequest}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {draftId ? "Gửi nháp" : "Gửi yêu cầu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== DropImagePreview ===== */
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
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
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
              <ImageIcon className="h-5 w-5 mr-2" /> Kéo-thả hoặc chọn ảnh
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={open}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
          >
            <Upload className="h-4 w-4" /> Chọn ảnh
          </button>
          {hasImage && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
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
