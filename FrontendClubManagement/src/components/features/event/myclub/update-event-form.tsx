"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"
import { getAllEventTypes, type EventTypeDto } from "@/service/EventService"

export interface UpdateEventFormData {
  title?: string
  description?: string
  location?: string
  startTime?: string
  endTime?: string
  eventTypeId?: string
  eventImages?: File[]
  deleteMediaIds?: number[] // IDs của media cần xóa
}

interface UpdateEventFormProps {
  initial?: {
    title?: string
    description?: string
    location?: string
    startTime?: string // datetime-local string
    endTime?: string   // datetime-local string
    eventTypeId?: string // optional; if not provided, keep unchanged
    existingMedia?: Array<{ id: number; url: string; type: "IMAGE" | "VIDEO" }> // Media cũ đã upload
  }
  onSubmit: (data: UpdateEventFormData) => Promise<void>
  onSuccess: () => void
}

export function UpdateEventForm({ initial, onSubmit, onSuccess }: UpdateEventFormProps) {
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState<UpdateEventFormData>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    startTime: initial?.startTime ?? "",
    endTime: initial?.endTime ?? "",
    eventTypeId: initial?.eventTypeId ?? "",
    eventImages: [],
    deleteMediaIds: [],
  })
  const [existingMedia, setExistingMedia] = useState<Array<{ id: number; url: string; type: "IMAGE" | "VIDEO" }>>(initial?.existingMedia ?? [])
  const [newMediaPreview, setNewMediaPreview] = useState<string[]>([]) // Preview cho media mới upload
  const [newMediaTypes, setNewMediaTypes] = useState<Array<"image" | "video">>([]) // Track type của media mới
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const types: EventTypeDto[] = await getAllEventTypes()
        setEventTypes(types.map(t => ({ id: String(t.id), name: t.typeName })))
      } catch (e) {
        // ignore silently
      }
    })()
  }, [])

  // Fetch existing media nếu có eventId từ initial (từ event-detail-modal)
  useEffect(() => {
    if (initial?.existingMedia && initial.existingMedia.length > 0) {
      setExistingMedia(initial.existingMedia)
    }
  }, [initial?.existingMedia])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, eventTypeId: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate file types - support both images and videos
    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"
    ]
    
    const validFiles = files.filter((file) => allowedTypes.includes(file.type))
    if (validFiles.length !== files.length) {
      setError("Chỉ chấp nhận các file ảnh (JPEG, PNG, WebP, GIF) hoặc video (MP4, WebM, OGG)")
      return
    }

    // Check file size (e.g., max 100MB for videos)
    const maxSize = 100 * 1024 * 1024 // 100MB
    const oversizedFiles = validFiles.filter((file) => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      setError("File quá lớn. Kích thước tối đa là 100MB")
      return
    }

    setFormData((prev) => ({ ...prev, eventImages: [...(prev.eventImages ?? []), ...validFiles] }))
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file))
    const newTypes = validFiles.map((file) => file.type.startsWith("video/") ? "video" : "image" as "image" | "video")
    setNewMediaPreview((prev) => [...prev, ...newPreviews])
    setNewMediaTypes((prev) => [...prev, ...newTypes])
    setError(null)
  }

  const removeExistingMedia = (mediaId: number) => {
    setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId))
    setFormData((prev) => ({
      ...prev,
      deleteMediaIds: [...(prev.deleteMediaIds ?? []), mediaId]
    }))
  }

  const removeNewMedia = (index: number) => {
    setFormData((prev) => ({ ...prev, eventImages: (prev.eventImages ?? []).filter((_, i) => i !== index) }))
    URL.revokeObjectURL(newMediaPreview[index])
    setNewMediaPreview((prev) => prev.filter((_, i) => i !== index))
    setNewMediaTypes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Optional validations: only validate if values are provided
    if (formData.startTime && formData.endTime) {
      if (new Date(formData.startTime) >= new Date(formData.endTime)) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu")
        return
      }
    }

    try {
      setIsLoading(true)
      await onSubmit(formData)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật sự kiện")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">{error}</div>}

      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề sự kiện</Label>
        <Input id="title" name="title" placeholder="Không đổi nếu để trống" value={formData.title ?? ""} onChange={handleInputChange} disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea id="description" name="description" placeholder="Không đổi nếu để trống" value={formData.description ?? ""} onChange={handleInputChange} rows={4} disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Địa điểm</Label>
        <Input id="location" name="location" placeholder="Không đổi nếu để trống" value={formData.location ?? ""} onChange={handleInputChange} disabled={isLoading} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Thời gian bắt đầu</Label>
          <Input id="startTime" name="startTime" type="datetime-local" value={formData.startTime ?? ""} onChange={handleInputChange} disabled={isLoading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Thời gian kết thúc</Label>
          <Input id="endTime" name="endTime" type="datetime-local" value={formData.endTime ?? ""} onChange={handleInputChange} disabled={isLoading} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventType">Loại sự kiện</Label>
        <Select value={formData.eventTypeId ?? ""} onValueChange={handleSelectChange}>
          <SelectTrigger id="eventType" disabled={isLoading}>
            <SelectValue placeholder="Không đổi nếu để trống" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name.toUpperCase() === "MEETING" ? `${type.name} (Sự kiện nội bộ)` : type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventImages">Hình ảnh / Video sự kiện</Label>
        
        {/* Hiển thị media cũ */}
        {existingMedia.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">Media hiện có:</div>
            <div className="grid grid-cols-3 gap-3">
              {existingMedia.map((media) => (
                <Card key={media.id} className="relative overflow-hidden group">
                  {media.type === "VIDEO" ? (
                    <video
                      src={media.url}
                      className="w-full h-24 object-cover"
                      controls={false}
                      muted
                    />
                  ) : (
                    <img src={media.url || "/placeholder.svg"} alt={`Existing media ${media.id}`} className="w-full h-24 object-cover" />
                  )}
                  {media.type === "VIDEO" && (
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      Video
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingMedia(media.id)}
                    disabled={isLoading}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upload area */}
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition">
          <input id="eventImages" type="file" multiple accept="image/*,video/*" onChange={handleImageChange} disabled={isLoading} className="hidden" />
          <label htmlFor="eventImages" className="cursor-pointer block">
            <div className="text-sm text-muted-foreground">
              Kéo thả hình ảnh/video hoặc <span className="text-primary font-medium">chọn từ máy tính</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Hỗ trợ: JPEG, PNG, WebP, GIF, MP4, WebM, OGG (tối đa 100MB/file)</div>
          </label>
        </div>

        {/* Preview media mới */}
        {newMediaPreview.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-muted-foreground mb-2">Media mới:</div>
            <div className="grid grid-cols-3 gap-3">
              {newMediaPreview.map((preview, index) => (
                <Card key={index} className="relative overflow-hidden group">
                  {newMediaTypes[index] === "video" ? (
                    <video
                      src={preview}
                      className="w-full h-24 object-cover"
                      controls={false}
                      muted
                    />
                  ) : (
                    <img src={preview || "/placeholder.svg"} alt={`New preview ${index + 1}`} className="w-full h-24 object-cover" />
                  )}
                  {newMediaTypes[index] === "video" && (
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      Video
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeNewMedia(index)}
                    disabled={isLoading}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? "Đang cập nhật..." : "Cập nhật"}</Button>
      </div>
    </form>
  )
}
