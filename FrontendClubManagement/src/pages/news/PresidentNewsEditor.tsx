import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { draftsApi } from "@/api/newsDrafts";
import { createRequest } from "@/api/newsWorkflow";
import ThumbnailPicker from "@/components/ThumbnailPicker";
import type { NewsData, PageResp, RequestStatus } from "@/types/news";

export default function PresidentNewsEditor() {
  const nav = useNavigate();
  const { clubId: clubIdParam } = useParams();
  const clubId = Number(clubIdParam);
  const location = useLocation() as { state?: { draft?: NewsData } };

  const [draftId, setDraftId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [newsType, setNewsType] = useState("");
  const [saving, setSaving] = useState(false);

  // lấy draftId từ URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const did = Number(params.get("draftId"));
    setDraftId(Number.isFinite(did) ? did : null);
  }, []);

  // Prefill: ưu tiên state.draft, fallback bằng list().find()
  useEffect(() => {
    if (location.state?.draft) {
      const d = location.state.draft;
      setTitle(d.title || "");
      setContent(d.content || "");
      setThumbnailUrl(d.thumbnailUrl || "");
      setNewsType(d.newsType || "");
      return;
    }
    const loadFallback = async () => {
      if (!draftId) return;
      try {
        const res = await draftsApi.list({ page: 0, size: 100, clubId });
        const page: PageResp<NewsData> | undefined = res.data;
        const found = page?.content?.find((x) => x.id === draftId);
        if (found) {
          setTitle(found.title || "");
          setContent(found.content || "");
          setThumbnailUrl(found.thumbnailUrl || "");
          setNewsType(found.newsType || "");
        }
      } catch {}
    };
    loadFallback();
  }, [draftId, clubId, location.state]);

  const validate = () => {
    if (!title.trim()) { alert("Thiếu tiêu đề"); return false; }
    if (!content.trim()) { alert("Thiếu nội dung"); return false; }
    if (!Number.isFinite(clubId)) { alert("Thiếu clubId trên URL"); return false; }
    return true;
  };

  const saveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (draftId) {
        const res = await draftsApi.update(draftId, {
          title, content,
          thumbnailUrl: thumbnailUrl || undefined,
          newsType: newsType || undefined,
        });
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Update draft failed");
        alert(`Đã cập nhật nháp #${res.data.id}`);
      } else {
        const res = await draftsApi.create({
          title, content,
          thumbnailUrl: thumbnailUrl || undefined,
          newsType: newsType || undefined,
          clubId,
        } as any);
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Create draft failed");
        alert(`Đã lưu nháp #${res.data.id}`);
      }
      nav(`/myclub/${clubId}/news`);
    } catch (e: any) {
      alert(e?.message || "Không lưu được nháp");
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (draftId) {
        const res = await draftsApi.submit(draftId);
        if (res.code !== 200) throw new Error(res.message || "Submit draft failed");
        const payload = res.data as { requestId: number; status: RequestStatus };
        alert(`Đã submit nháp #${draftId} → request #${payload?.requestId}`);
      } else {
        const res = await createRequest({
          title, content,
          thumbnailUrl: thumbnailUrl || undefined,
          newsType: newsType || undefined,
          clubId,
        } as any);
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Create request failed");
        alert(`Đã tạo request #${res.data.id}`);
      }
      nav(`/myclub/${clubId}/news`);
    } catch (e:any) {
      alert(e?.message || "Không submit được request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {draftId ? "Sửa nháp • Chủ nhiệm CLB" : "Soạn news • Chủ nhiệm CLB"}
        </h1>
      </div>

      <div className="grid gap-3">
        <input className="border rounded p-2 w-full" placeholder="Tiêu đề" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea className="border rounded p-2 w-full min-h-[200px]" placeholder="Nội dung" value={content} onChange={e=>setContent(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ThumbnailPicker value={thumbnailUrl} onChange={setThumbnailUrl} />
          <input className="border rounded p-2" placeholder="News type (vd: EVENT)" value={newsType} onChange={e=>setNewsType(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={saveDraft} className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-50" disabled={saving}>
          {saving ? "Đang lưu…" : (draftId ? "Cập nhật nháp" : "Lưu bản nháp")}
        </button>
        <button onClick={submitRequest} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={saving}>
          {saving ? "Đang gửi…" : (draftId ? "Submit nháp" : "Submit request")}
        </button>
      </div>
    </div>
  );
}
