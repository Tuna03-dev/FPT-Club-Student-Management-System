import { EventCalendar } from "../../../components/features/event/myclub/event-calender";
import { useParams } from "react-router-dom";

export const EventList = () => {
  // Lấy clubId từ URL: /myclub/:clubId/events
  const params = useParams();
  const clubId = Number(params.clubId);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h6 className="text-4xl font-bold text-foreground mb-2">Quản lý sự kiện</h6>
          <p className="text-muted-foreground">Quản lý sự kiện của câu lạc bộ</p>
        </div>
        <EventCalendar clubId={clubId} />
      </div>
    </main>
  );
};

