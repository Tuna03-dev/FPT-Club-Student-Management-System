import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicClubs } from "@/api/publicClubs";
import type { ClubCard, PageResp } from "@/types/publicClub";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function ClubsPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResp<ClubCard> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPublicClubs({ page, size: 12 })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">Khám Phá Các Câu Lạc Bộ</h1>
          <p className="text-xl opacity-90">
            Tìm kiếm và tham gia các câu lạc bộ phù hợp với đam mê của bạn
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        {loading && (
          <div className="text-center text-muted-foreground">
            Đang tải danh sách CLB...
          </div>
        )}

        {!loading && data && (
          <>
            {/* Clubs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.content.map((club) => (
                <Link key={club.id} to={`/club/${club.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="relative h-48 bg-muted overflow-hidden">
                      <img
                        src={
                          club.bannerUrl || club.logoUrl || "/placeholder.svg"
                        }
                        alt={club.clubName}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2">
                        {club.clubName}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {club.shortDescription}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{club.totalTeams ?? 0} phòng ban</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {club.topTags.slice(0, 2).map((t) => (
                            <Badge key={t} variant="secondary">
                              {t}
                            </Badge>
                          ))}
                          {club.tagsOverflow > 0 && (
                            <Badge variant="outline">
                              +{club.tagsOverflow}
                            </Badge>
                          )}
                        </div>
                        <Button className="w-full mt-4">Xem Chi Tiết</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {data.number + 1}/{data.totalPages || 1}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.last}
              >
                Sau
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
