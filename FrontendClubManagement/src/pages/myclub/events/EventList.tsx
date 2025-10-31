import { EventCalendar } from "../../../components/features/event/myclub/event-calender";

export const EventList = () => {
  // TODO: Lấy clubId từ context hoặc props
  // Hiện tại hardcode để test
  const clubId = 1;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">FPT Club Events</h1>
          <p className="text-muted-foreground">Quản lý sự kiện của câu lạc bộ</p>
        </div>
        <EventCalendar clubId={clubId} />
      </div>
    </main>
  );
};

