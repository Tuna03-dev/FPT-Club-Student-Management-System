import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const MemberList = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const members = [
    {
      id: "1",
      name: "Nguyễn Văn A",
      role: "Chủ tịch",
      department: "Ban Chuyên môn",
      joinDate: "01/01/2024",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    },
    {
      id: "2",
      name: "Trần Thị B",
      role: "Phó chủ tịch",
      department: "Ban Truyền thông",
      joinDate: "15/01/2024",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
    },
    {
      id: "3",
      name: "Lê Văn C",
      role: "Thành viên",
      department: "Ban Tổ chức",
      joinDate: "20/02/2024",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
    },
    {
      id: "4",
      name: "Phạm Thị D",
      role: "Thành viên",
      department: "Ban Nội vụ",
      joinDate: "05/03/2024",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Thành viên</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý danh sách thành viên câu lạc bộ
          </p>
        </div>
        <Link to="/myclub/members/add">
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Thêm thành viên
          </Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm thành viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Lọc
        </Button>
      </div>

      {/* Members List */}
      <div className="grid gap-4">
        {members.map((member) => (
          <Link
            key={member.id}
            to={`/myclub/members/${member.id}`}
            className="block"
          >
            <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-all hover:border-primary/50">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-sm px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {member.role}
                    </span>
                    <span className="text-sm px-2 py-1 rounded-full bg-secondary text-foreground">
                      {member.department}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tham gia</p>
                  <p className="text-sm font-medium">{member.joinDate}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

