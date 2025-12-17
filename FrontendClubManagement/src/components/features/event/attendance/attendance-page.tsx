

import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Save, Download, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { AttendanceItem } from "./attendance-item"
import { EventHeader } from "./event-header"
import { 
  getEventRegistrations, 
  batchMarkAttendance, 
  getEventById,
  exportAttendanceExcel,
  type EventRegistrationDto,
  type BatchMarkAttendanceItem
} from "@/service/EventService"
import { authService } from "@/services/authService"

interface Student {
  id: string
  userId: number
  name: string
  studentId: string
  attendance: "present" | "absent" | null
  note: string
}

interface Event {
  id: string
  name: string
  date: string
  time: string
  location: string
}

interface AttendancePageProps {
  eventId?: string | number
  event?: Event
}

export function AttendancePage({ eventId, event: propEvent }: AttendancePageProps) {
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [event, setEvent] = useState<Event | undefined>(propEvent)
  const [eventClubId, setEventClubId] = useState<number | null>(null)
  
  // Check systemRole in clubRoleList instead of global systemRole
  const clubRole = eventClubId ? authService.getClubRole(eventClubId) : null
  const systemRoleInClub = clubRole?.systemRole?.toUpperCase()
  const isPresident = eventClubId && systemRoleInClub === "CLUB_OFFICER"
  const isOfficer =
    eventClubId &&
    (systemRoleInClub === "TEAM_OFFICER" ||
      systemRoleInClub === "CLUB_TREASURE" ||
      systemRoleInClub === "CLUB_TREASURER")
  const canMarkAttendance = isPresident || isOfficer
  const readOnly = (searchParams.get("mode") ?? "") === "view" || !canMarkAttendance

  // Fetch event data and registrations
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return
      
      try {
        setLoading(true)
        const eventIdNum = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId
        
        // Fetch event details
        const eventData = await getEventById(eventIdNum)
        const startDate = new Date(eventData.startTime)
        
        setEvent({
          id: eventData.id.toString(),
          name: eventData.title,
          date: startDate.toLocaleDateString("vi-VN"),
          time: startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          location: eventData.location || "Chưa có địa điểm"
        })
        // Store clubId from event for permission check
        setEventClubId(eventData.clubId ?? null)
        
        // Fetch registrations
        const registrations = await getEventRegistrations(eventIdNum)
        
        // Map to Student interface
        const mappedStudents: Student[] = registrations.map((reg: EventRegistrationDto) => ({
          id: reg.id.toString(),
          userId: reg.userId,
          name: reg.fullName,
          studentId: reg.studentCode || reg.email,
          attendance: reg.attendanceStatus === "PRESENT" ? "present" 
                     : reg.attendanceStatus === "ABSENT" ? "absent" 
                     : null,
          note: reg.notes || ""
        }))
        
        setStudents(mappedStudents)
      } catch (error) {
        console.error("Error fetching attendance data:", error)
        toast.error("Không thể tải dữ liệu điểm danh")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [eventId])

  // Debounced server search
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!eventId) return
      try {
        const eventIdNum = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId
        const registrations = await getEventRegistrations(eventIdNum, searchTerm || undefined)
        const mappedStudents: Student[] = registrations.map((reg: EventRegistrationDto) => ({
          id: reg.id.toString(),
          userId: reg.userId,
          name: reg.fullName,
          studentId: reg.studentCode || reg.email,
          attendance: reg.attendanceStatus === "PRESENT" ? "present" 
                     : reg.attendanceStatus === "ABSENT" ? "absent" 
                     : null,
          note: reg.notes || ""
        }))
        setStudents(mappedStudents)
      } catch { /* empty */ }
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm, eventId])

  const filteredStudents = students

  const handleAttendanceChange = (studentId: string, status: "present" | "absent") => {
    setStudents(students.map((s) => (s.id === studentId ? { ...s, attendance: status } : s)))
  }

  const handleNoteChange = (studentId: string, note: string) => {
    setStudents(students.map((s) => (s.id === studentId ? { ...s, note } : s)))
  }

  const presentCount = students.filter((s) => s.attendance === "present").length
  const absentCount = students.filter((s) => s.attendance === "absent").length

  const handleSave = async () => {
    if (!eventId) {
      toast.error("Không tìm thấy thông tin sự kiện")
      return
    }
    
    try {
      setSaving(true)
      const eventIdNum = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId
      
      // Prepare batch attendance data
      const attendances: BatchMarkAttendanceItem[] = students
        .filter(s => s.attendance !== null)
        .map(s => ({
          userId: s.userId,
          attendanceStatus: s.attendance === "present" ? "PRESENT" : "ABSENT",
          notes: s.note || undefined
        }))
      
      if (attendances.length === 0) {
        toast.info("Vui lòng điểm danh ít nhất một người tham gia")
        return
      }
      
      await batchMarkAttendance({
        eventId: eventIdNum,
        attendances
      })
      
      toast.success("Điểm danh đã được lưu thành công!")
      
      // Refresh data
      const registrations = await getEventRegistrations(eventIdNum)
      const mappedStudents: Student[] = registrations.map((reg: EventRegistrationDto) => ({
        id: reg.id.toString(),
        userId: reg.userId,
        name: reg.fullName,
        studentId: reg.studentCode || reg.email,
        attendance: reg.attendanceStatus === "PRESENT" ? "present" 
                   : reg.attendanceStatus === "ABSENT" ? "absent" 
                   : null,
        note: reg.notes || ""
      }))
      setStudents(mappedStudents)
    } catch (error: any) {
      console.error("Error saving attendance:", error)
      toast.error(error?.response?.data?.message || "Không thể lưu điểm danh")
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    if (!eventId) {
      toast.error("Không tìm thấy thông tin sự kiện")
      return
    }

    try {
      setExporting(true)
      const eventIdNum = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId
      
      // Gọi API export Excel từ backend
      const blob = await exportAttendanceExcel(eventIdNum)
      
      // Kiểm tra blob có hợp lệ không
      if (!blob || blob.size === 0) {
        throw new Error("File Excel rỗng hoặc không hợp lệ")
      }
      
      // Kiểm tra xem có phải là JSON error không (khi backend trả về error nhưng status 200)
      if (blob.type === 'application/json' || blob.type.startsWith('text/')) {
        const text = await blob.text()
        try {
          const errorData = JSON.parse(text)
          throw new Error(errorData.message || errorData.data?.message || "Không thể xuất file Excel")
        } catch {
          throw new Error("Không thể xuất file Excel. Vui lòng thử lại sau.")
        }
      }
      
      // Tạo URL từ blob và download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      
      // Lấy tên file từ Content-Disposition header hoặc dùng tên mặc định
      const fileName = event?.name 
        ? `${event.name.replace(/[^a-zA-Z0-9\s]/g, "_").replace(/\s+/g, "_")}_DiemDanh.xlsx`
        : `DiemDanh_${eventIdNum}_${new Date().toISOString().split("T")[0]}.xlsx`
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      
      toast.success("Xuất Excel thành công!")
    } catch (error: any) {
      console.error("Error exporting Excel:", error)
      const errorMessage = error?.message || error?.response?.data?.message || "Không thể xuất file Excel"
      toast.error(errorMessage)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {/* Event Header Skeleton */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Skeleton className="h-9 w-16 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Student List Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Actions Skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Skeleton className="h-10 flex-1" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>

            {/* Student List Skeleton */}
            <div className="divide-y">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1 pl-4 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <EventHeader event={event} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{presentCount}</div>
              <p className="text-sm text-muted-foreground">Có mặt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">{absentCount}</div>
              <p className="text-sm text-muted-foreground">Vắng mặt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-muted-foreground">
                {students.length - presentCount - absentCount}
              </div>
              <p className="text-sm text-muted-foreground">Chưa điểm danh</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách sinh viên</CardTitle>
          <CardDescription>Điểm danh cho sự kiện ngày hôm nay</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc mã sinh viên..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload} 
                disabled={exporting}
                className="gap-2 bg-transparent"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Đang xuất...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Xuất Excel</span>
                  </>
                )}
              </Button>
              {!readOnly && (
              <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={saving}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">Lưu</span>
                  </>
                )}
              </Button>
              )}
            </div>
          </div>

          <div className="divide-y">
              {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <AttendanceItem
                  key={student.id}
                  student={student}
                  onAttendanceChange={handleAttendanceChange}
                  onNoteChange={handleNoteChange}
                  disabled={readOnly}
                />
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">Không tìm thấy sinh viên nào</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
