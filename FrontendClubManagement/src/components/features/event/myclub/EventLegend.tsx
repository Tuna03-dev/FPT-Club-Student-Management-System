"use client"
import { Card } from "@/components/ui/card"
import { authService } from "@/services/authService"

interface EventLegendProps {
  clubId?: number
}

export function EventLegend({ clubId }: EventLegendProps) {
  const user = authService.getCurrentUser()
  const isStaff = user?.systemRole === "STAFF"
  // Check systemRole in clubRoleList instead of global systemRole
  const clubRole = clubId ? authService.getClubRole(clubId) : null
  const systemRoleInClub = clubRole?.systemRole?.toUpperCase()
  const showPending = isStaff || (clubId && systemRoleInClub && ["CLUB_OFFICER", "TEAM_OFFICER"].includes(systemRoleInClub))

  return (
    <Card className="p-6 shadow-lg">
      <h3 className="text-lg font-bold text-foreground mb-4">Trạng thái sự kiện</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm text-foreground">Sắp diễn ra</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-sm text-foreground">Đang diễn ra</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-sm text-foreground">Đã kết thúc</span>
        </div>
        {showPending && (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-gray-400"></div>
            <span className="text-sm text-foreground">Chờ duyệt</span>
          </div>
        )}
      </div>
    </Card>
  )
}

