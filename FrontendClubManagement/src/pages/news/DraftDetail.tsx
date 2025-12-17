"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { draftsApi } from "@/api/newsDrafts";
import type { NewsData } from "@/types/news";
import { ArrowLeft, RefreshCw, Send, Pencil, Trash2, Tag } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CurrentUser {
  id: number | null;
}

function getCurrentUser(): CurrentUser {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { id: null };
    const u = JSON.parse(raw);
    return { id: Number(u?.id) || null };
  } catch {
    return { id: null };
  }
}

export default function DraftDetail() {
  const nav = useNavigate();
  const {
    clubId: clubIdParam,
    teamId: teamIdParam,
    draftId: draftIdParam,
  } = useParams();

  // club/team id có thể undefined ở route STAFF (/staff/news/drafts/:draftId)
  const clubId = useMemo(() => {
    const n = Number(clubIdParam);
    return Number.isFinite(n) ? n : null;
  }, [clubIdParam]);

  const teamId = useMemo(() => {
    const n = Number(teamIdParam);
    return Number.isFinite(n) ? n : null;
  }, [teamIdParam]);

  const draftId = useMemo(() => {
    const n = Number(draftIdParam);
    return Number.isFinite(n) ? n : null;
  }, [draftIdParam]);

  const staffContext = !Number.isFinite(Number(clubIdParam)); // không có clubId ⇒ đang ở /staff/...
  const { id: meId } = getCurrentUser();
  const token = localStorage.getItem("accessToken");

  const { isConnected, subscribeToClub, subscribeToUserQueue } =
    useWebSocket(token);

  const [item, setItem] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [doing, setDoing] = useState<string | null>(null);

  const goBack = () => {
    if (staffContext) {
      nav("/staff/news?tab=drafts");
      return;
    }
    if (teamId && clubId) nav(`/myclub/${clubId}/teams/${teamId}?tab=drafts`);
    else if (clubId) nav(`/myclub/${clubId}/news?tab=drafts`);
    else nav(-1);
  };

  useEffect(() => {
    const load = async () => {
      if (!draftId) {
        toast.error("Thiếu draftId trên URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const rs = await draftsApi.get(draftId);
        setItem((rs as any).data ?? rs);
      } catch (e: any) {
        toast.error(e?.message || "Không tải được bản nháp.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [draftId]);

  useEffect(() => {
    if (!isConnected || !draftId) return;

    const unsubClub = clubId
      ? subscribeToClub(clubId, (msg) => {
          if (
            msg.type === "NEWS_DRAFT" &&
            (msg.payload as { id?: number })?.id === draftId
          ) {
            toast.info(
              "Bản nháp này đã được cậ p nhật hoặc gửi đi. Quay lại danh sách."
            );
            setTimeout(goBack, 2500);
          }
        })
      : null;

    const unsubUser = subscribeToUserQueue((msg) => {
      if (
        msg.type === "NEWS_DRAFT" &&
        (msg.payload as { id?: number })?.id === draftId
      ) {
        toast.info("Bản nháp này đã thay đổi hoặc bị xóa.");
        setTimeout(goBack, 2500);
      }
    });

    return () => {
      unsubClub?.();
      unsubUser?.();
    };
  }, [isConnected, draftId, clubId]);

  const isAuthor = !!meId && !!item?.authorId && meId === item.authorId;

  const onEdit = () => {
    if (!item) return;
    if (staffContext) {
      nav(`/staff/news-editor?draftId=${item.id}`, { state: { draft: item } });
      return;
    }
    if (teamId && clubId) {
      nav(`/myclub/${clubId}/teams/${teamId}/news-editor?draftId=${item.id}`, {
        state: { draft: item },
      });
    } else if (clubId) {
      nav(`/myclub/${clubId}/news-editor?draftId=${item.id}`, {
        state: { draft: item },
      });
    } else {
      nav(`/staff/news-editor?draftId=${item.id}`, { state: { draft: item } });
    }
  };

  const onSubmit = async () => {
    if (!item) return;
    if (!confirm(`Submit bản nháp #${item.id} thành request?`)) return;
    setDoing("submit");
    try {
      await draftsApi.submit(item.id);
      toast.success("Đã submit bản nháp thành công.");
      setTimeout(goBack, 2000);
    } catch (e: any) {
      toast.error(e?.message || "Không submit được.");
    } finally {
      setDoing(null);
    }
  };

  const onDelete = async () => {
    if (!item) return;
    if (!confirm(`Xóa bản nháp #${item.id}?`)) return;
    setDoing("delete");
    try {
      await draftsApi.remove(item.id);
      toast.success("Đã xóa bản nháp.");
      setTimeout(goBack, 2000);
    } catch (e: any) {
      toast.error(e?.message || "Không xóa được.");
    } finally {
      setDoing(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-sm text-slate-500">
        <RefreshCw className="inline h-4 w-4 mr-2 animate-spin" />
        Đang tải…
      </div>
    );
  }
  if (!item) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex justify-end">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
      </div>

      {/* Thumbnail */}
      <div className="rounded-2xl overflow-hidden bg-slate-100">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl || "/default-fallback-image.png"}
            alt={item.title || "thumbnail"}
            className="w-full h-[340px] object-cover"
            onError={(e) =>
              (e.currentTarget.src = "/default-fallback-image.png")
            }
          />
        ) : (
          <div className="w-full h-[220px] bg-gradient-to-br from-slate-100 to-slate-200" />
        )}
      </div>

      {/* Title + meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            Bản nháp
          </span>
          {item.newsType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
              <Tag className="h-3.5 w-3.5" /> {item.newsType}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight leading-snug">
          {item.title}
        </h1>
        <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
          {item.clubName && <span>CLB {item.clubName}</span>}
          {item.authorName && (
            <span>
              Tác giả: {item.authorName}
              {item.authorEmail ? ` (${item.authorEmail})` : ""}
            </span>
          )}
          {item.updatedAt && (
            <span>
              Cập nhật: {new Date(item.updatedAt).toLocaleString("vi-VN")}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <article className="prose max-w-none leading-relaxed whitespace-pre-wrap">
        {item.content || "—"}
      </article>

      {/* Actions */}
      {(staffContext || isAuthor) && (
        <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" /> Sửa
          </button>
          <button
            onClick={onSubmit}
            disabled={doing === "submit"}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white",
              doing === "submit"
                ? "bg-indigo-400"
                : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            <Send className="h-4 w-4" />{" "}
            {doing === "submit" ? "Đang gửi…" : "Submit"}
          </button>
          <button
            onClick={onDelete}
            disabled={doing === "delete"}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white",
              doing === "delete"
                ? "bg-rose-400"
                : "bg-rose-600 hover:bg-rose-700"
            )}
          >
            <Trash2 className="h-4 w-4" />{" "}
            {doing === "delete" ? "Đang xóa…" : "Xóa"}
          </button>
        </div>
      )}
    </div>
  );
}
