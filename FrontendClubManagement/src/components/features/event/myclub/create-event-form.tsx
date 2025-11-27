"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"

interface CreateEventFormProps {
  eventTypes: Array<{ id: string; name: string }>
  onSubmit: (data: EventFormData) => Promise<void>
  onSuccess: () => void
  initialStartTime?: string
  initialEndTime?: string
}

export interface EventFormData {
  title: string
  description: string
  location: string
  startTime: string
  endTime: string
  eventType: string
  eventImages: File[] // Keep name for backward compatibility, but now supports both images and videos
}

export function CreateEventForm({ eventTypes, onSubmit, onSuccess, initialStartTime, initialEndTime }: CreateEventFormProps) {
  const toLocalDateTimeInputValue = (date: Date) => {
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }

  const [minStartTime, setMinStartTime] = useState(() => toLocalDateTimeInputValue(new Date()))

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    location: "",
    startTime: initialStartTime ?? "",
    endTime: initialEndTime ?? "",
    eventType: "",
    eventImages: [],
  })

  // Sync initial times when dialog opens with preset values
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      startTime: initialStartTime ?? prev.startTime,
      endTime: initialEndTime ?? prev.endTime,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStartTime, initialEndTime])

  // Keep min start time synced with current time (updated every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      setMinStartTime(toLocalDateTimeInputValue(new Date()))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Ensure current selections always respect the minimum start time
  useEffect(() => {
    setFormData((prev) => {
      let changed = false
      let startTime = prev.startTime
      let endTime = prev.endTime
      if (startTime && new Date(startTime) < new Date(minStartTime)) {
        startTime = minStartTime
        changed = true
      }
      const minEndCandidate = startTime || minStartTime
      if (endTime && new Date(endTime) < new Date(minEndCandidate)) {
        endTime = minEndCandidate
        changed = true
      }
      if (!changed) return prev
      return {
        ...prev,
        startTime,
        endTime,
      }
    })
  }, [minStartTime])

  const [imagePreview, setImagePreview] = useState<string[]>([])
  const [mediaTypes, setMediaTypes] = useState<Array<"image" | "video">>([]) // Track type of each media
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === "startTime") {
      const clampedValue = value && new Date(value) < new Date(minStartTime) ? minStartTime : value
      setFormData((prev) => {
        const minEndCandidate = clampedValue || minStartTime
        const endTimeNeedsUpdate =
          prev.endTime && new Date(prev.endTime) < new Date(minEndCandidate)
        return {
          ...prev,
          startTime: clampedValue,
          endTime: endTimeNeedsUpdate ? minEndCandidate : prev.endTime,
        }
      })
      return
    }

    if (name === "endTime") {
      const minEndCandidate = formData.startTime || minStartTime
      const clampedValue =
        value && new Date(value) < new Date(minEndCandidate) ? minEndCandidate : value
      setFormData((prev) => ({
        ...prev,
        endTime: clampedValue,
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      eventType: value,
    }))
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

    setFormData((prev) => ({
      ...prev,
      eventImages: [...prev.eventImages, ...validFiles],
    }))

    // Create preview URLs and track media types
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file))
    const newTypes = validFiles.map((file) => file.type.startsWith("video/") ? "video" : "image" as "image" | "video")
    setImagePreview((prev) => [...prev, ...newPreviews])
    setMediaTypes((prev) => [...prev, ...newTypes])
    setError(null)
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      eventImages: prev.eventImages.filter((_, i) => i !== index),
    }))
    URL.revokeObjectURL(imagePreview[index])
    setImagePreview((prev) => prev.filter((_, i) => i !== index))
    setMediaTypes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề sự kiện")
      return
    }

    if (!formData.description.trim()) {
      setError("Vui lòng nhập mô tả sự kiện")
      return
    }

    if (!formData.location.trim()) {
      setError("Vui lòng nhập địa điểm sự kiện")
      return
    }

    if (!formData.startTime) {
      setError("Vui lòng chọn thời gian bắt đầu")
      return
    }

    if (!formData.endTime) {
      setError("Vui lòng chọn thời gian kết thúc")
      return
    }

    const startTime = new Date(formData.startTime)
    const endTime = new Date(formData.endTime)
    const now = new Date()

    if (startTime < now) {
      setError("Thời gian bắt đầu phải lớn hơn hoặc bằng thời gian hiện tại")
      return
    }

    if (startTime >= endTime) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu")
      return
    }

    if (!formData.eventType) {
      setError("Vui lòng chọn loại sự kiện")
      return
    }

    try {
      setIsLoading(true)
      await onSubmit(formData)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo sự kiện")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">{error}</div>}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề sự kiện *</Label>
        <Input
          id="title"
          name="title"
          placeholder="Nhập tiêu đề sự kiện"
          value={formData.title}
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Mô tả *</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Nhập mô tả chi tiết về sự kiện"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          disabled={isLoading}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Địa điểm *</Label>
        <Input
          id="location"
          name="location"
          placeholder="Nhập địa điểm sự kiện"
          value={formData.location}
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </div>

      {/* Start Time and End Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Thời gian bắt đầu *</Label>
          <Input
            id="startTime"
            name="startTime"
            type="datetime-local"
            min={minStartTime}
            value={formData.startTime}
            onChange={handleInputChange}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Thời gian kết thúc *</Label>
          <Input
            id="endTime"
            name="endTime"
            type="datetime-local"
            min={formData.startTime || minStartTime}
            value={formData.endTime}
            onChange={handleInputChange}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Event Type */}
      <div className="space-y-2">
        <Label htmlFor="eventType">Loại sự kiện *</Label>
        <Select value={formData.eventType} onValueChange={handleSelectChange}>
          <SelectTrigger id="eventType" disabled={isLoading}>
            <SelectValue placeholder="Chọn loại sự kiện" />
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

      {/* Event Media (Images & Videos) */}
      <div className="space-y-2">
        <Label htmlFor="eventImages">Hình ảnh / Video sự kiện</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition">
          <input
            id="eventImages"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleImageChange}
            disabled={isLoading}
            className="hidden"
          />
          <label htmlFor="eventImages" className="cursor-pointer block">
            <div className="text-sm text-muted-foreground">
              Kéo thả hình ảnh/video hoặc <span className="text-primary font-medium">chọn từ máy tính</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Hỗ trợ: JPEG, PNG, WebP, GIF, MP4, WebM, OGG (tối đa 100MB/file)</div>
          </label>
        </div>

        {/* Media Preview */}
        {imagePreview.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {imagePreview.map((preview, index) => (
              <Card key={index} className="relative overflow-hidden group">
                {mediaTypes[index] === "video" ? (
                  <video
                    src={preview}
                    className="w-full h-24 object-cover"
                    controls={false}
                    muted
                  />
                ) : (
                  <img
                    src={preview || "/placeholder.svg"}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />
                )}
                {mediaTypes[index] === "video" && (
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    Video
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={isLoading}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              title: "",
              description: "",
              location: "",
              startTime: "",
              endTime: "",
              eventType: "",
              eventImages: [],
            })
            setImagePreview([])
            setMediaTypes([])
            setError(null)
          }}
          disabled={isLoading}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Đang tạo..." : "Tạo sự kiện"}
        </Button>
      </div>
    </form>
  )
}
