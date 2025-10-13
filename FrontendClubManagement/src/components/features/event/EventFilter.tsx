"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
interface EventFiltersProps {
  selectedCategory: string
  selectedStatus: string
  onCategoryChange: (category: string) => void
  onStatusChange: (status: string) => void
}

const categories = [
  { value: "all", label: "Tất cả" },
  { value: "Workshop", label: "Workshop" },
  { value: "Competition", label: "Cuộc thi" },
  { value: "Seminar", label: "Hội thảo" },
  { value: "Entertainment", label: "Giải trí" },
  { value: "Career", label: "Nghề nghiệp" },
]

const statuses = [
  { value: "all", label: "Tất cả" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "ongoing", label: "Đang diễn ra" },
  { value: "completed", label: "Đã kết thúc" },
  { value: "registration-open", label: "Đang mở đăng ký" },
]

export function EventFilters({
  selectedCategory,
  selectedStatus,
  onCategoryChange,
  onStatusChange,
}: EventFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Label htmlFor="category-select" className="text-sm font-medium mb-2 block">
          Thể loại
        </Label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger id="category-select" className="w-full">
            <SelectValue placeholder="Chọn thể loại" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Label htmlFor="status-select" className="text-sm font-medium mb-2 block">
          Trạng thái
        </Label>
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger id="status-select" className="w-full">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
