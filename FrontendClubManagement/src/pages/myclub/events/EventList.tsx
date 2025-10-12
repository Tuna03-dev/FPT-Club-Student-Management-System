import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const EventList = () => {
  // Mock data
  const events = [
    {
      id: "1",
      title: "Họp Ban chấp hành",
      date: "15/10/2024",
      time: "19:00",
      location: "Phòng họp A",
      attendees: 25,
      status: "upcoming",
    },
    {
      id: "2",
      title: "Workshop kỹ năng mềm",
      date: "18/10/2024",
      time: "14:00",
      location: "Hội trường lớn",
      attendees: 120,
      status: "upcoming",
    },
    {
      id: "3",
      title: "Giao lưu với CLB bạn",
      date: "20/10/2024",
      time: "15:30",
      location: "Sân vận động",
      attendees: 80,
      status: "upcoming",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sự kiện</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý các sự kiện và hoạt động
          </p>
        </div>
        <Link to="/myclub/events/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo sự kiện mới
          </Button>
        </Link>
      </div>

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/myclub/events/${event.id}`}
            className="block"
          >
            <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-all hover:border-primary/50 h-full">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500">
                    Sắp diễn ra
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {event.date} - {event.time}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{event.attendees} người tham gia</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

