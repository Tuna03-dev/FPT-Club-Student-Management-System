

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X } from "lucide-react"

interface Student {
  id: string
  userId?: number
  name: string
  studentId: string
  attendance: "present" | "absent" | null
  note: string
}

interface AttendanceItemProps {
  student: Student
  onAttendanceChange: (studentId: string, status: "present" | "absent") => void
  onNoteChange: (studentId: string, note: string) => void
  disabled?: boolean
}

export function AttendanceItem({ student, onAttendanceChange, onNoteChange, disabled }: AttendanceItemProps) {
  return (
    <div className="py-4">
      <div className="flex items-center gap-4">
        {/* Left section: Student name and ID */}
        <div className="min-w-0 flex-1 pl-4">
          <p className="font-medium text-foreground">{student.name}</p>
          <p className="text-sm text-muted-foreground">{student.studentId}</p>
        </div>

        {/* Right section: Present button, Absent button, then Note input */}
        <div className="flex items-center gap-3">
          <Button
            variant={student.attendance === "present" ? "default" : "outline"}
            size="sm"
            className={`gap-2 ${student.attendance === "present" ? "bg-green-600 hover:bg-green-700" : ""}`}
            onClick={() => onAttendanceChange(student.id, "present")}
            disabled={disabled}
          >
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">Có</span>
          </Button>

          <Button
            variant={student.attendance === "absent" ? "default" : "outline"}
            size="sm"
            className={`gap-2 ${student.attendance === "absent" ? "bg-red-600 hover:bg-red-700" : ""}`}
            onClick={() => onAttendanceChange(student.id, "absent")}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Vắng</span>
          </Button>

          <Input
            placeholder="Ghi chú"
            value={student.note}
            onChange={(e) => onNoteChange(student.id, e.target.value)}
            className="h-8 w-32 text-sm"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
