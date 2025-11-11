"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getNewsById, type NewsData } from "@/service/NewsService"
import { ArrowLeft, Save } from "lucide-react"

export default function StaffNewsEdit() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const nav = useNavigate()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [content, setContent] = useState("")
  const [thumbUrl, setThumbUrl] = useState<string | undefined>(undefined)

  const [file, setFile] = useState<File | null>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : thumbUrl), [file, thumbUrl])
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const d: NewsData = await getNewsById(id)
        if (!alive) return
        setTitle(d.title || "")
        setDesc(d.content?.slice(0, 180) || "")
        setContent(d.content || "")
        setThumbUrl(d.thumbnailUrl || undefined)
      } catch (e: any) {
        alert(e?.message || "Không tải được tin")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  const onSave = async () => {
    alert("TODO: gọi API cập nhật (kèm upload nếu chọn ảnh mới)")
    nav(`/staff/news/${id}`)
  }

  if (!Number.isFinite(id)) return <div className="max-w-6xl mx-auto p-4">ID không hợp lệ.</div>
  if (loading) return <div className="max-w-6xl mx-auto p-4 text-sm text-slate-500">Đang tải…</div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => nav(-1)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
      </div>

      <h1 className="text-3xl font-extrabold">Sửa tin #{id}</h1>

      <div className="space-y-3">
        <label className="text-sm font-medium">Ảnh thumbnail</label>
        <div className="w-full h-[260px] bg-slate-100 rounded-2xl overflow-hidden">
          {preview ? (
            <img src={preview || "/placeholder.svg"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">Chưa chọn ảnh</div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
            }}
          />
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
            onClick={() => fileRef.current?.click()}
          >
            Chọn ảnh từ máy
          </button>
          {file && (
            <button
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
              onClick={() => setFile(null)}
            >
              Bỏ ảnh vừa chọn
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tiêu đề</label>
        <input className="w-full border rounded-lg p-2.5" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Mô tả ngắn</label>
        <textarea
          className="w-full border rounded-lg p-2.5 min-h-[80px]"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nội dung chi tiết</label>
        <textarea
          className="w-full border rounded-lg p-2.5 min-h-[180px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="flex gap-2 border-t pt-4">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700"
          onClick={onSave}
        >
          <Save className="h-4 w-4" /> Lưu thay đổi
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
          onClick={() => nav(-1)}
        >
          Hủy
        </button>
      </div>
    </div>
  )
}
