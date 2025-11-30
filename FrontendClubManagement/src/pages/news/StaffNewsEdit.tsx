// src/pages/news/StaffNewsEdit.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getNewsById } from "@/service/NewsService";
import { uploadImageOnly } from "@/api/uploads";
import { staffNewsAdminApi } from "@/api/staffNewsAdmin";
import { toast } from "sonner";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Image as ImageIcon } from "lucide-react";

/** Giữ đúng list như StaffNewsEditor */
const NEWS_TYPES = [
  { value: "Tin chung", label: "Tin chung" },
  { value: "Sự kiện", label: "Sự kiện" },
  { value: "Thành tích", label: "Thành tích" },
  { value: "Tuyển thành viên", label: "Tuyển thành viên" },
  { value: "Lập trình", label: "Lập trình" },
  { value: "Thể Thao", label: "Thể Thao" },
] as const;

/** Kiểu dữ liệu tối thiểu đủ cho form (tránh đụng NewsData trong types khác) */
type EditorNews = {
  id: number;
  title?: string | null;
  content?: string | null;
  newsType?: string | null;
  thumbnailUrl?: string | null;
};

type LocationState = {
  hidden?: boolean;
  deleted?: boolean;
};

export default function StaffNewsEdit() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const nav = useNavigate();
  const location = useLocation() as { state?: LocationState };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newsType, setNewsType] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");

  // preview & file giống StaffNewsEditor
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [fileObj, setFileObj] = useState<File | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const d: EditorNews = (await getNewsById(id)) as EditorNews; // ép về kiểu hẹp
        if (!alive) return;

        setTitle(d?.title || "");
        setContent(d?.content || "");
        setNewsType(d?.newsType || "");
        setThumbnailUrl(d?.thumbnailUrl || "");
        setThumbPreview(d?.thumbnailUrl || "");
      } catch (e: any) {
        toast.error(e?.message || "Không tải được tin tức");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const validate = () => {
    if (!title.trim()) {
      toast.error("Thiếu tiêu đề");
      return false;
    }
    if (!content.trim()) {
      toast.error("Thiếu nội dung");
      return false;
    }
    if (!newsType.trim()) {
      toast.error("Chọn loại tin");
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // nếu đổi ảnh -> upload; không thì dùng URL cũ
      let finalThumb = thumbnailUrl || undefined;
      if (fileObj) {
        const up = await uploadImageOnly(fileObj);
        finalThumb = up?.url;
        setThumbnailUrl(up?.url || "");
      }

      // PATCH nội dung
      await staffNewsAdminApi.update(id, {
        title: title.trim(),
        content: content.trim(),
        type: newsType, // API của bạn field "type"
        thumbnailUrl: finalThumb ?? null, // required theo validatePayload()
      });

      // Re-apply trạng thái nếu cần (để sửa xong vẫn ẩn / vẫn xóa mềm)
      const wasHidden = !!location.state?.hidden;
      const wasDeleted = !!location.state?.deleted;

      if (wasHidden) {
        try {
          await staffNewsAdminApi.hide(id);
        } catch {}
      }
      if (wasDeleted) {
        try {
          await staffNewsAdminApi.softDelete(id);
        } catch {}
      }

      toast.success("Đã lưu thay đổi");
      nav("/staff/news"); // điều hướng về danh sách news
    } catch (e: any) {
      toast.error(e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (!Number.isFinite(id)) {
    return <div className="max-w-4xl mx-auto p-6">ID không hợp lệ.</div>;
  }
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold">Ảnh thumbnail</label>
          <div className="rounded-2xl overflow-hidden bg-slate-100 h-[220px]" />
        </div>
        <div className="space-y-3">
          <label className="text-sm font-semibold">Tiêu đề</label>
          <div className="rounded-lg bg-slate-100 h-9" />
        </div>
        <div className="space-y-3">
          <label className="text-sm font-semibold">Loại tin</label>
          <div className="rounded-lg bg-slate-100 h-9 w-[220px]" />
        </div>
        <div className="space-y-3">
          <label className="text-sm font-semibold">Nội dung</label>
          <div className="rounded-lg bg-slate-100 h-[240px]" />
        </div>
        <div className="flex gap-3 pt-6 border-t">
          <div className="rounded-lg bg-slate-100 h-11 w-[160px]" />
          <div className="rounded-lg bg-slate-100 h-11 w-[120px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* FORM giống StaffNewsEditor */}
      <div className="space-y-4">
        {/* Drop-zone */}
        <div className="space-y-3">
          <label className="text-sm font-semibold">Ảnh thumbnail</label>
          <DropImagePreview
            preview={thumbPreview || thumbnailUrl}
            onPick={(file, dataUrl) => {
              setFileObj(file);
              setThumbPreview(dataUrl);
            }}
            onClear={() => {
              setFileObj(null);
              setThumbPreview("");
              setThumbnailUrl("");
            }}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold">Tiêu đề</label>
          <input
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tiêu đề tin tức"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold">Loại tin</label>
          <Select
            value={newsType || undefined}
            onValueChange={(v) => setNewsType(v)}
          >
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
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold">Nội dung</label>
          <textarea
            className="w-full border rounded-lg p-3 min-h-[280px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập nội dung tin tức"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-6 border-t">
        <button
          onClick={onSave}
          className="px-6 py-3 rounded-lg bg-gray-900 text-white font-medium disabled:opacity-50 hover:bg-gray-800 transition"
          disabled={saving}
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
        <button
          onClick={() => nav("/staff/news")}
          className="px-6 py-3 rounded-lg border hover:bg-slate-50 transition"
          disabled={saving}
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

/** Drop-zone giống StaffNewsEditor: preview bằng DataURL, chặn dán link thuần */
function DropImagePreview({
  preview,
  onPick,
  onClear,
}: {
  preview?: string;
  onPick: (file: File, dataUrl: string) => void;
  onClear: () => void;
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
        if (e.clipboardData?.getData("text/plain")) e.preventDefault(); // chặn dán link
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
            <ImageIcon className="h-5 w-5 mr-2" /> Kéo-thả hoặc bấm để chọn ảnh
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
