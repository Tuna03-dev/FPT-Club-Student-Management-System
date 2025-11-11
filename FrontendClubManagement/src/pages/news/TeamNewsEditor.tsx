"use client"

import type React from "react"

import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { draftsApi } from "@/api/newsDrafts"
import { requestsApi } from "@/api/newsRequests"
import { useTeamLeadGuard } from "@/hooks/useTeamLeadGuard"
import type { NewsData, RequestStatus } from "@/types/news"
import { ArrowLeft, Send, Loader2, ImageIcon, Upload, X } from "lucide-react"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

const DEFAULT_THUMB = "/placeholder.svg"

const NEWS_TYPES = [
  { value: "Tin chung", label: "Tin chung" },
  { value: "Sự kiện", label: "Sự kiện" },
  { value: "Thành tích", label: "Thành tích" },
  { value: "Tuyển thành viên", label: "Tuyển thành viên" },
  { value: "Lập trình", label: "Lập trình" },
  { value: "Thể Thao", label: "Thể Thao" },
] as const

export default function TeamNewsEditor() {
  const nav = useNavigate()
  const { clubId: clubIdParam, teamId: teamIdParam } = useParams()
  const clubId = Number(clubIdParam)
  const teamId = Number(teamIdParam)
  const { allowed, error } = useTeamLeadGuard(clubId, teamId)
  const location = useLocation() as { state?: { draft?: NewsData } }

  const [draftId, setDraftId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
  const [newsType, setNewsType] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const did = Number(p.get("draftId"))
    setDraftId(Number.isFinite(did) ? did : null)
  }, [])

  useEffect(() => {
    if (location.state?.draft) {
      const d = location.state.draft
      setTitle(d.title || "")
      setContent(d.content || "")
      setThumbnailUrl(d.thumbnailUrl || "")
      setNewsType(d.newsType || "")
      return
    }
    const loadById = async () => {
      if (!draftId) return
      try {
        const res = await draftsApi.get(draftId)
        const d = res.data as NewsData | undefined
        if (d) {
          setTitle(d.title || "")
          setContent(d.content || "")
          setThumbnailUrl(d.thumbnailUrl || "")
          setNewsType(d.newsType || "")
        }
      } catch {
        /* ignore */
      }
    }
    loadById()
  }, [draftId, location.state])

  if (allowed === false) return <div className="p-6 text-sm text-destructive">Bạn không có quyền truy cập. {error}</div>
  if (allowed === null) return <div className="p-6 text-sm text-muted-foreground">Đang kiểm tra quyền…</div>

  const validate = () => {
    if (!title.trim()) {
      alert("Thiếu tiêu đề")
      return false
    }
    if (!content.trim()) {
      alert("Thiếu nội dung")
      return false
    }
    return true
  }

  const saveDraft = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (draftId) {
        const res = await draftsApi.update(draftId, {
          title,
          content,
          thumbnailUrl: thumbnailUrl || undefined,
          newsType: newsType || undefined,
        })
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Update draft failed")
        alert(`Đã cập nhật nháp #${res.data.id}`)
      } else {
        const res = await draftsApi.create({
          title,
          content,
          thumbnailUrl: thumbnailUrl || undefined,
          newsType: newsType || undefined,
          clubId,
          teamId,
        } as any)
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Create draft failed")
        alert(`Đã lưu nháp #${res.data.id}`)
      }
      nav(`/myclub/${clubId}/teams/${teamId}?tab=drafts`, { replace: true })
    } catch (e: any) {
      alert(e?.message || "Không lưu được nháp")
    } finally {
      setSaving(false)
    }
  }

  const submitRequest = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (draftId) {
        const res = await draftsApi.submit(draftId)
        if (res.code !== 200) throw new Error(res.message || "Submit draft failed")
        const payload = res.data as { requestId: number; status: RequestStatus }
        alert(`Đã submit nháp #${draftId} → request #${payload?.requestId}`)
      } else {
        const res = await requestsApi.create({
          title,
          content,
          thumbnailUrl: thumbnailUrl || undefined,
          newsType: newsType || undefined,
          clubId,
          teamId,
        })
        if (res.code !== 200 || !res.data) throw new Error(res.message || "Create request failed")
        alert(`Đã tạo request #${res.data.id}`)
      }
      nav(`/myclub/${clubId}/teams/${teamId}?tab=requests`, { replace: true })
    } catch (e: any) {
      alert(e?.message || "Không gửi được request")
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => nav(-1)

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
            {draftId ? `Sửa nháp #${draftId}` : "Tạo bài mới"}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            {draftId ? "Sửa bản nháp" : "Soạn bài viết mới"}
          </h1>
          <p className="text-sm text-muted-foreground">Quản lý nội dung tin tức cho đội của bạn</p>
        </div>

        {/* Form Container */}
        <div className="space-y-6 pb-32">
          {/* Title Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tiêu đề</label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Nhập tiêu đề bài viết"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nội dung</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              placeholder="Viết nội dung bài viết của bạn"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Image & Type Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ImagePicker value={thumbnailUrl} onChange={setThumbnailUrl} label="Ảnh đại diện" />
            </div>

            {/* News Type Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Loại bài viết</label>
              <Select value={newsType || undefined} onValueChange={(v) => setNewsType(v)}>
                <SelectTrigger className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary">
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
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-border bg-background backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {draftId ? `Chỉnh sửa nháp #${draftId}` : "Bản nháp mới"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {draftId ? "Cập nhật" : "Lưu nháp"}
            </button>
            <button
              onClick={submitRequest}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {draftId ? "Gửi nháp" : "Gửi yêu cầu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImagePicker({
  value,
  onChange,
  label,
}: {
  value?: string
  onChange: (url: string) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const hasImage = Boolean(value)

  const openFileDialog = () => inputRef.current?.click()

  const handleFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return
    const url = URL.createObjectURL(file)
    onChange(url)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    if (inputRef.current) inputRef.current.value = ""
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const clear = () => onChange("")

  return (
    <div className="space-y-2">
      {label ? <label className="text-sm font-medium text-foreground">{label}</label> : null}

      <div
        className={`relative rounded-lg border-2 border-dashed transition-all ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        } p-4`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div
          className="aspect-[16/9] w-full rounded-md bg-muted overflow-hidden cursor-pointer group"
          onClick={openFileDialog}
          title="Chọn ảnh từ máy (click) hoặc kéo-thả vào đây"
        >
          {hasImage ? (
            <img src={value || "/placeholder.svg"} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <img
              src={DEFAULT_THUMB || "/placeholder.svg"}
              alt="placeholder"
              className="w-full h-full object-cover opacity-40"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openFileDialog}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            <Upload className="h-4 w-4" />
            Chọn ảnh
          </button>

          {hasImage ? (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors text-sm font-medium"
            >
              <X className="h-4 w-4" />
              Xoá
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-4 w-4" /> Chưa chọn ảnh
            </span>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>
    </div>
  )
}
