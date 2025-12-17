import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicClubDetail } from "@/api/publicClubs";
import type { ClubDetail } from "@/types/publicClub";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Calendar, MapPin } from "lucide-react";
import { Users2 } from "lucide-react";

export default function ClubDetailPage() {
  const { id } = useParams();
  const clubId = Number(id);
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    getPublicClubDetail(clubId, "teams,events,news")
      .then(setClub)
      .finally(() => setLoading(false));
  }, [clubId]);

  const foundedYear = useMemo(() => {
    if (!club?.createdAt) return undefined;
    try {
      return new Date(club.createdAt).getFullYear();
    } catch {
      return undefined;
    }
  }, [club]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải chi tiết CLB...</div>;
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy câu lạc bộ</h1>
          <Link to="/clubs">
            <Button>Quay lại danh sách</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Back */}
      <div className="bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link to="/clubs" className="flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-96 bg-muted overflow-hidden">
        <img src={club.bannerUrl || club.logoUrl || "/placeholder.svg"} alt={club.clubName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Info */}
      <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-10">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <CardTitle className="text-4xl mb-2">{club.clubName}</CardTitle>
                <CardDescription className="text-lg mb-4">{club.description}</CardDescription>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{club.departmentsCount ?? 0} phòng ban</span>
                  </div>
                  {foundedYear && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Thành lập {foundedYear}</span>
                    </div>
                  )}
                  {club.campusName && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{club.campusName}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button size="lg">Tham Gia Câu Lạc Bộ</Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="about" className="mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about">Giới Thiệu</TabsTrigger>
            <TabsTrigger value="departments">Phòng Ban</TabsTrigger>
            <TabsTrigger value="events">Sự Kiện</TabsTrigger>
          </TabsList>

          {/* About */}
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>Về Câu Lạc Bộ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Mô Tả Chi Tiết</h3>
                  <p className="text-muted-foreground leading-relaxed">{club.description || "—"}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-3">Thông Tin Liên Hệ</h3>
                    <div className="space-y-2 text-sm">
                      {club.email && (
                        <p>
                          <span className="text-muted-foreground">Email:</span><br />
                          <a href={`mailto:${club.email}`} className="text-primary hover:underline">{club.email}</a>
                        </p>
                      )}
                      {club.phone && (
                        <p>
                          <span className="text-muted-foreground">Điện thoại:</span><br />
                          <a href={`tel:${club.phone}`} className="text-primary hover:underline">{club.phone}</a>
                        </p>
                      )}
                      {club.categoryName && (
                        <p>
                          <span className="text-muted-foreground">Lĩnh vực:</span><br />
                          {club.categoryName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Mạng Xã Hội</h3>
                    <div className="flex flex-wrap gap-2">
                      {club.fbUrl && (
                        <a href={club.fbUrl} target="_blank" rel="noreferrer">
                          <Badge variant="secondary">Facebook</Badge>
                        </a>
                      )}
                      {club.igUrl && (
                        <a href={club.igUrl} target="_blank" rel="noreferrer">
                          <Badge variant="secondary">Instagram</Badge>
                        </a>
                      )}
                      {club.ttUrl && (
                        <a href={club.ttUrl} target="_blank" rel="noreferrer">
                          <Badge variant="secondary">TikTok</Badge>
                        </a>
                      )}
                      {club.ytUrl && (
                        <a href={club.ytUrl} target="_blank" rel="noreferrer">
                          <Badge variant="secondary">YouTube</Badge>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments */}
          <TabsContent value="departments">
  <div className="grid gap-4">
    {club.teams?.length ? (
      club.teams.map((dept) => (
        <Card key={dept.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{dept.teamName}</CardTitle>
                {dept.description && (
                  <CardDescription>{dept.description}</CardDescription>
                )}
              </div>

              {/* Badge số thành viên */}
              {typeof dept.memberCount === "number" && (
                <Badge>{dept.memberCount} thành viên</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            {/* Trưởng ban */}
            {dept.leaderName && (
              <div className="flex items-center gap-2 text-sm">
                <Users2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Trưởng ban:</span>
                <span className="font-medium">{dept.leaderName}</span>
              </div>
            )}

            {/* Link group chat */}
          </CardContent>
        </Card>
      ))
    ) : (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Chưa có phòng ban nào
        </CardContent>
      </Card>
    )}
  </div>
</TabsContent>

          {/* Events */}
          <TabsContent value="events">
            <div className="grid gap-4">
              {club.events?.length ? (
                club.events.map((ev) => (
                  <Card key={ev.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{ev.title}</h3>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(ev.startTime).toLocaleString()}</span>
                            </div>
                            {ev.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{ev.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">Đăng Ký</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">Hiện chưa có sự kiện nào được lên lịch</CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}