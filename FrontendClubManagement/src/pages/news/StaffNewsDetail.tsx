"use client";

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getNewsById, type NewsData } from "@/service/NewsService";
import { staffNewsAdminApi } from "@/api/staffNewsAdmin";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type LocationState = {
  hidden?: boolean;
  deleted?: boolean;
} | null;

export default function StaffNewsDetail() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const nav = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);

  // trạng thái UI giống list
  const [hidden, setHidden] = useState<boolean>(!!state.hidden);
  const [deleted, setDeleted] = useState<boolean>(!!state.deleted);
  const [busyHide, setBusyHide] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) return;

    let alive = true;
    (async () => {
      try {
        const d = await getNewsById(id);
        if (!alive) return;
        setData(d);

        // nếu BE cũng trả hidden/deleted thì sync theo
        const anyD = d as any;
        if (typeof anyD.hidden === "boolean") setHidden(anyD.hidden);
        if (typeof anyD.deleted === "boolean") setDeleted(anyD.deleted);
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

  const fmt = (dt?: string | null) =>
    dt ? new Date(dt).toLocaleString("vi-VN") : "—";

  // Ẩn / hiện giống StaffNewsList
  const handleToggleHide = async () => {
    if (!data || deleted) return;
    const nextHidden = !hidden;
    setBusyHide(true);
    setHidden(nextHidden);
    try {
      if (nextHidden) await staffNewsAdminApi.hide(id);
      else await staffNewsAdminApi.unhide(id);
    } catch (e: any) {
      setHidden(!nextHidden);
      toast.error(e?.message || "Ẩn/hiện thất bại.");
    } finally {
      setBusyHide(false);
    }
  };

  // Xóa mềm giống StaffNewsList
  const handleSoftDelete = async () => {
    if (!data || deleted) return;
    if (!window.confirm("Bạn chắc chắn muốn xóa mềm bài news này?")) return;

    setBusyDelete(true);
    try {
      await staffNewsAdminApi.softDelete(id);
      setDeleted(true);
      toast.success("Đã xóa mềm bài news.");
    } catch (e: any) {
      toast.error(e?.message || "Xóa mềm thất bại.");
    } finally {
      setBusyDelete(false);
    }
  };

  if (!Number.isFinite(id)) {
    return <div className="max-w-6xl mx-auto p-4">ID không hợp lệ.</div>;
  }
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-sm text-slate-500">
        Đang tải…
      </div>
    );
  }
  if (!data) {
    return <div className="max-w-6xl mx-auto p-4">Không tìm thấy tin.</div>;
  }

  // label trạng thái giống list
  const statusBadge = (
    <div className="flex items-center gap-2 flex-wrap">
      {deleted && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
          ĐÃ XÓA
        </span>
      )}
      {!deleted && hidden && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          ĐÃ ẨN
        </span>
      )}
      {!deleted && !hidden && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          HIỆN
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => nav(-1)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
      </div>

      {/* Thumbnail */}
      <div className="rounded-2xl overflow-hidden bg-slate-100">
        {data.thumbnailUrl ? (
          <img
            src={data.thumbnailUrl || "/placeholder.svg"}
            className="w-full h-[340px] object-cover"
          />
        ) : (
          <div className="w-full h-[220px] bg-gradient-to-br from-slate-100 to-slate-200" />
        )}
      </div>

      {/* Title + meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {data.newsType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
              <Tag className="h-3.5 w-3.5" /> {data.newsType}
            </span>
          )}
          {statusBadge}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight leading-snug">
          {data.title}
        </h1>
        <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
          {data.clubName && <span>{data.clubName}</span>}
          {data.updatedAt && <span>Cập nhật: {fmt(data.updatedAt)}</span>}
        </div>
      </div>

      {/* Content */}
      <article className="prose max-w-none leading-relaxed whitespace-pre-wrap">
        {data.content}
      </article>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
        <button
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => nav(`/staff/news/${id}/edit`)}
          disabled={deleted}
        >
          <Pencil className="h-4 w-4" /> Sửa
        </button>

        <button
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-3 py-2 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleSoftDelete}
          disabled={busyDelete || deleted}
        >
          {busyDelete ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {deleted ? "Đã xóa" : "Xóa mềm"}
        </button>

        <button
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleToggleHide}
          disabled={busyHide || deleted}
        >
          {busyHide ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : hidden ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          {hidden ? "Hiện lại" : "Ẩn bài"}
        </button>
      </div>

      {/* View public */}
      <div className="border-t pt-4">
        <Link
          to={`/news/${id}`}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 ${
            deleted
              ? "text-slate-400 cursor-not-allowed pointer-events-none"
              : "text-indigo-600 hover:underline"
          }`}
        >
          <Eye className="h-4 w-4" /> Mở trang public
        </Link>
      </div>
    </div>
  );
}
