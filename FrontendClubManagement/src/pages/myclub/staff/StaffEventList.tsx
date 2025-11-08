import { useState, useEffect } from "react";
import { EventCalendar } from "../../../components/features/event/myclub/event-calender";
import { getAllClubs, type ClubDto } from "@/service/EventService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const StaffEventList = () => {
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [clubs, setClubs] = useState<ClubDto[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoadingClubs(true);
        const clubsData = await getAllClubs();
        setClubs(clubsData || []);
      } catch (error) {
        console.error("Error fetching clubs:", error);
      } finally {
        setLoadingClubs(false);
      }
    };
    fetchClubs();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Quản lý sự kiện</h1>
            <p className="text-muted-foreground">Xem tất cả sự kiện hoặc lọc theo câu lạc bộ</p>
          </div>
          
          {/* Club filter dropdown for Staff */}
          <div className="flex items-center gap-2">
            <label htmlFor="club-select" className="text-sm font-medium text-foreground">
              Lọc theo CLB:
            </label>
            <Select
              value={selectedClubId?.toString() || "all"}
              onValueChange={(value) => {
                if (value === "all") {
                  setSelectedClubId(null);
                } else {
                  setSelectedClubId(Number(value));
                }
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn CLB" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả CLB</SelectItem>
                {loadingClubs ? (
                  <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                ) : (
                  clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.clubName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* EventCalendar - if selectedClubId is null, it will show all events for Staff */}
        {/* Pass 0 to indicate "all events" when no club is selected */}
        {selectedClubId ? (
          <EventCalendar clubId={selectedClubId} />
        ) : (
          <EventCalendar clubId={0} />
        )}
      </div>
    </main>
  );
};

