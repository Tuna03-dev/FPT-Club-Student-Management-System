import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { draftsApi } from "@/api/newsDrafts";
import type { NewsData, PageResp, RequestStatus } from "@/types/news";
import { useTeamLeadGuard } from "@/hooks/useTeamLeadGuard";

function fmt(dt?: string | null) { if (!dt) return "-"; const d = new Date(dt); return isNaN(d.getTime()) ? dt : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`; }

export default function TeamNewsDrafts() {
  const nav = useNavigate();
  const { clubId: clubIdParam, teamId: teamIdParam } = useParams();
  const clubId = Number(clubIdParam); const teamId = Number(teamIdParam);
  const { allowed, error } = useTeamLeadGuard(clubId, teamId);

  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [drafts, setDrafts] = useState<NewsData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [doing, setDoing] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await draftsApi.list({ page, size, clubId, teamId });
      const pageData: PageResp<NewsData> | undefined = res.data;
      setDrafts(pageData?.content ?? []);
      setTotal(pageData?.totalElements ?? (pageData?.content?.length ?? 0));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clubId, teamId, page, size]);

  if (allowed === false) return <div className="p-4 text-sm text-red-600">Bạn không có quyền truy cập. {error}</div>;
  if (allowed === null) return <div className="p-4 text-sm text-slate-500">Đang kiểm tra quyền…</div>;

  const onEdit = (draft: NewsData) => {
    nav(`/myclub/${clubId}/teams/${teamId}/news-editor?draftId=${draft.id}`, { state: { draft } });
  };
  const onSubmit = async (newsId: number) => {
    if (!confirm(`Submit bản nháp #${newsId} thành request lên Chủ nhiệm CLB?`)) return;
    setDoing(newsId);
    setDrafts((prev) => prev.filter((d) => d.id !== newsId)); setTotal((prev) => Math.max(0, prev - 1));
    try {
      const res = await draftsApi.submit(newsId);
      if (res.code !== 200) throw new Error(res.message || "Submit draft failed");
    } catch (e:any) {
      alert(e?.message || "Không submit được nháp"); await load();
    } finally { setDoing(null); }
  };
  const onDelete = async (newsId: number) => {
    if (!confirm(`Xóa bản nháp #${newsId}?`)) return;
    setDoing(newsId);
    try {
      const res = await draftsApi.remove(newsId);
      if (res.code !== 200) throw new Error(res.message || "Delete draft failed");
      await load();
    } catch (e:any) { alert(e?.message || "Không xóa được nháp"); }
    finally { setDoing(null); }
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Drafts • Phòng ban</h1>
      </div>

      <div className="border rounded-md overflow-x-auto bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
              <th>ID</th><th>Title</th><th>Content</th><th>Thumbnail</th><th>NewsType</th><th>Club</th><th>Updated At</th><th className="w-[240px]">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 align-top">
            {loading && <tr><td colSpan={8} className="text-slate-500">Đang tải…</td></tr>}
            {!loading && drafts.map((d) => (
              <tr key={d.id} className="border-t">
                <td>#{d.id}</td>
                <td className="font-medium">{d.title}</td>
                <td className="text-slate-600 max-w-[420px] truncate" title={d.content || ""}>{d.content}</td>
                <td>{d.thumbnailUrl ? <a href={d.thumbnailUrl} target="_blank" rel="noreferrer" className="underline text-indigo-600">link</a> : "-"}</td>
                <td>{d.newsType ?? "-"}</td>
                <td>{d.clubId ? `#${d.clubId}` : "-"} {d.clubName ?? ""}</td>
                <td>{fmt(d.updatedAt)}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onEdit(d)} disabled={doing === d.id} className="px-2 py-1 rounded border" title="Sửa nháp">Sửa</button>
                    <button onClick={() => onSubmit(d.id)} disabled={doing === d.id} className="px-2 py-1 rounded bg-emerald-600 text-white" title="Submit nháp">Submit</button>
                    <button onClick={() => onDelete(d.id)} disabled={doing === d.id} className="px-2 py-1 rounded bg-rose-600 text-white" title="Xóa nháp">Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && drafts.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-sm text-slate-500">Chưa có bản nháp nào.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Hiển thị {drafts.length > 0 ? `1-${drafts.length}` : "0"} trên {total} bản nháp</span>
        <div className="flex gap-2">
          <button className="px-2 py-1 rounded border disabled:opacity-50" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
          <button className="px-2 py-1 rounded border disabled:opacity-50" disabled={(page + 1) * size >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
