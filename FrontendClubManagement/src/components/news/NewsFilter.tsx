"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ClubDto } from "@/service/NewsService"

interface NewsFiltersProps {
  clubs: ClubDto[]
  selectedClubId: string
  onClubChange: (clubId: string) => void
}

export function NewsFilters({
  clubs,
  selectedClubId,
  onClubChange,
}: NewsFiltersProps) {
  return (
    <div className="flex justify-end">
      <div className="w-64">
        <Label htmlFor="club-select" className="text-sm font-medium mb-2 block">
          Lọc theo câu lạc bộ
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
    </div>
  )
}
