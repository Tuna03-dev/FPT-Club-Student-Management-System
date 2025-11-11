// src/pages/news/StaffNewsEditor.tsx
"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Skeleton from "@/components/common/Skeleton";
import { draftsApi } from "@/api/newsDrafts";
import { staffDirectPublish } from "@/api/newsWorkflow";
import { uploadImageOnly } from "@/api/uploads";
import type { NewsData, PageResp } from "@/types/news";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const NEWS_TYPES = [
  { value: "Tin chung", label: "Tin chung" },
  { value: "Sự kiện", label: "Sự kiện" },
  { value: "Thành tích", label: "Thành tích" },
  { value: "Tuyển thành viên", label: "Tuyển thành viên" },
  { value: "Lập trình", label: "Lập trình" },
  { value: "Thể Thao", label: "Thể Thao" },
] as const;

export default function StaffNewsEditor() {
  const nav = useNavigate();
  const location = useLocation() as { state?: { draft?: NewsData } };

  const [draftId, setDraftId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newsType, setNewsType] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(""); // URL thật để gửi BE
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // preview & file cho drag-drop: giống TeamNewsEditor
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [fileObj, setFileObj] = useState<File | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const did = Number(params.get("draftId"));
    setDraftId(Number.isFinite(did) ? did : null);
  }, []);

  useEffect(() => {
    const loadFallback = async () => {
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
        const res = await draftsApi.list({ page: 0, size: 100 });
        const page: PageResp<NewsData> | undefined = res.data;
        const found = page?.content?.find((x) => x.id === draftId);
        if (found) {
          setTitle(found.title || "");
          setContent(found.content || "");
          setThumbnailUrl(found.thumbnailUrl || "");
          setThumbPreview(found.thumbnailUrl || "");
          setNewsType(found.newsType || "");
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    // start loading when effect runs
    setLoading(true);
    loadFallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, location.state]);

  const validate = () => {
    if (!title.trim()) {
      alert("Thiếu tiêu đề");
      return false;
    }
    if (!content.trim()) {
      alert("Thiếu nội dung");
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validate()) return;
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
        } as any);
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Create draft failed");
        alert(`Đã lưu nháp #${res.data.id}`);
      }
      nav("/staff/news");
    } catch (e: any) {
      alert(e?.message || "Không lưu được nháp");
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let finalThumb = thumbnailUrl || undefined;
      if (fileObj) {
        const up = await uploadImageOnly(fileObj);
        finalThumb = up.url;
        setThumbnailUrl(up.url);
      }

      if (draftId) {
        const res = await draftsApi.publish(draftId);
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Publish draft failed");
        alert(`Đã publish News #${res.data.id}`);
      } else {
        const res = await staffDirectPublish({
          title,
          content,
          thumbnailUrl: finalThumb,
          newsType: newsType || undefined,
        });
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Publish failed");
        alert(`Đã publish News #${res.data.newsId}`);
      }
      nav("/staff/news");
    } catch (e: any) {
      alert(e?.message || "Không publish được");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold">Ảnh thumbnail</label>
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* <h1 className="text-3xl font-bold">{draftId ? "Sửa nháp • Staff" : "Soạn news • Staff"}</h1> */}

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-semibold">Ảnh thumbnail</label>

          {/* Drop-zone giống TeamNewsEditor: preview dataURL */}
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
          <Select value={newsType || undefined} onValueChange={(v) => setNewsType(v)}>
            <SelectTrigger className="w-full px-3 py-2 rounded-lg border">
              <SelectValue placeholder="Chọn loại" />
            </SelectTrigger>
            <SelectContent>
              {NEWS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
          onClick={saveDraft}
          className="px-6 py-3 rounded-lg bg-gray-900 text-white font-medium disabled:opacity-50 hover:bg-gray-800 transition"
          disabled={saving}
        >
          {saving ? "Đang lưu…" : draftId ? "Cập nhật nháp" : "Lưu bản nháp"}
        </button>
        <button
          onClick={publishNow}
          className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50 hover:bg-green-700 transition"
          disabled={saving}
        >
          {saving ? "Đang đăng tin…" : draftId ? "Đăng lên từ nháp" : "Đăng ngay"}
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

/** Drop-zone giống TeamNewsEditor: preview bằng DataURL, không dán link */
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
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      onDrop={async (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false);
        await handleFile(e.dataTransfer.files?.[0]);
      }}
      onPaste={(e) => {
        if (e.clipboardData?.getData("text/plain")) e.preventDefault(); // chặn dán link
      }}
    >
      <div className="aspect-[16/9] w-full rounded-md bg-white overflow-hidden cursor-pointer" onClick={open}>
        {hasImage ? (
          <img src={preview} alt="thumbnail" className="w-full h-full object-cover" />
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
