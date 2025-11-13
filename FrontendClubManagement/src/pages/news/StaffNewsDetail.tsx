"use client"

import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { getNewsById, type NewsData } from "@/service/NewsService"
import { ArrowLeft, Pencil, Trash2, Eye, Tag } from "lucide-react"

export default function StaffNewsDetail() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const nav = useNavigate()
  const [data, setData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const d = await getNewsById(id)
        if (!alive) return
        setData(d)
      } catch (e: any) {
        alert(e?.message || "Không tải được tin tức")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  if (!Number.isFinite(id)) return <div className="max-w-6xl mx-auto p-4">ID không hợp lệ.</div>
  if (loading) return <div className="max-w-6xl mx-auto p-4 text-sm text-slate-500">Đang tải…</div>
  if (!data) return <div className="max-w-6xl mx-auto p-4">Không tìm thấy tin.</div>

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
          <img src={data.thumbnailUrl || "/placeholder.svg"} className="w-full h-[340px] object-cover" />
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
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight leading-snug">{data.title}</h1>
        <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
          {data.clubName && <span>{data.clubName}</span>}
          {data.updatedAt && <span>Cập nhật: {new Date(data.updatedAt).toLocaleString("vi-VN")}</span>}
        </div>
      </div>

      {/* Content */}
      <article className="prose max-w-none leading-relaxed whitespace-pre-wrap">{data.content}</article>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
        <button
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
          onClick={() => nav(`/staff/news/${id}/edit`)}
        >
          <Pencil className="h-4 w-4" /> Sửa
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-3 py-2 hover:bg-rose-700"
          onClick={() => alert("TODO: gọi API xóa")}
        >
          <Trash2 className="h-4 w-4" /> Xóa
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
          onClick={() => alert("TODO: gọi API ẩn/hiện")}
        >
          <Eye className="h-4 w-4" /> Ẩn/Hiện
        </button>
      </div>

      {/* View public */}
      <div className="border-t pt-4">
        <Link
          to={`/news/${id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-indigo-600 hover:underline"
        >
          <Eye className="h-4 w-4" /> Mở trang public
        </Link>
      </div>
    </div>
  )
}