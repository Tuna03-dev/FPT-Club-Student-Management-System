"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EventTypeDto, ClubDto } from "@/service/EventService"

interface EventFiltersProps {
  eventTypes: EventTypeDto[]
  clubs: ClubDto[]
  selectedTypeId: string
  selectedClubId: string
  selectedStatus: string
  onTypeChange: (eventTypeId: string) => void
  onClubChange: (clubId: string) => void
  onStatusChange: (status: string) => void
}

const statuses = [
  { value: "all", label: "Tất cả" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "ongoing", label: "Đang diễn ra" },
  { value: "completed", label: "Đã kết thúc" },
]

export function EventFilters({
  eventTypes,
  clubs,
  selectedTypeId,
  selectedClubId,
  selectedStatus,
  onTypeChange,
  onClubChange,
  onStatusChange,
}: EventFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Label htmlFor="type-select" className="text-sm font-medium mb-2 block">
          Loại sự kiện
        </Label>
        <Select value={selectedTypeId} onValueChange={onTypeChange}>
          <SelectTrigger id="type-select" className="w-full">
            <SelectValue placeholder="Chọn loại sự kiện" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="all" value="all">Tất cả</SelectItem>
            {eventTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {type.typeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Label htmlFor="club-select" className="text-sm font-medium mb-2 block">
          Câu lạc bộ
        </Label>
        <Select value={selectedClubId} onValueChange={onClubChange}>
          <SelectTrigger id="club-select" className="w-full">
            <SelectValue placeholder="Chọn câu lạc bộ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="all" value="all">Tất cả</SelectItem>
            {clubs.map((club) => (
              <SelectItem key={club.id} value={String(club.id)}>
                {club.clubName}
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
