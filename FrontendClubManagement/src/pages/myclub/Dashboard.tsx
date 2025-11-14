import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { CreatePost } from "@/components/features/post/CreatePost";
import { PostCard } from "@/components/features/post/PostCard";
import {
  postService,
  type PostWithRelationsData,
} from "@/services/postService";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const Dashboard = () => {
  const [posts, setPosts] = useState<PostWithRelationsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Dùng ref để tránh dependency issues
  const loadingRef = useRef(false);

  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const clubId = clubIdParam ? parseInt(clubIdParam, 10) : 1;

  useEffect(() => {
    if (!clubIdParam || isNaN(clubId)) {
      toast.error("Không tìm thấy ID câu lạc bộ. Vui lòng kiểm tra URL.");
    }
  }, [clubIdParam, clubId]);

  // Load posts function
  const loadPosts = useCallback(
    async (page: number, append: boolean = false) => {
      if (loadingRef.current) return; // Prevent double loading

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        const response = await postService.getClubFeed(clubId, {
          page: page,
          size: 10,
          sort: "createdAt,desc",
        });

        if (response.code === 200 && response.data) {
          const newPosts = response.data.content;

          setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
          setCurrentPage(response.data.number);
          setTotalPages(response.data.totalPages);
        } else {
          const message = response.message || "Không thể tải bài viết";
          setError(message);
          toast.error(message);
        }
      } catch (err) {
        console.error("Error loading posts:", err);
        const message = "Có lỗi khi tải bài viết";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [clubId]
  );

  // Load initial posts
  useEffect(() => {
    loadPosts(0, false);
  }, [clubId, loadPosts]);

  // IntersectionObserver sentinel-based infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    if (currentPage >= totalPages - 1) return;

    loadPosts(currentPage + 1, true);
  }, [currentPage, totalPages, loadPosts]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          currentPage < totalPages - 1 &&
          !loadingRef.current
        ) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, currentPage, totalPages]);

  const refreshPosts = () => {
    setCurrentPage(0);
    setTotalPages(0);
    setPosts([]);
    loadPosts(0, false);
  };

  const convertPostToCard = (post: PostWithRelationsData) => {
    const imageMedia = (post.media || []).filter(
      (m) => m && m.mediaType === "IMAGE"
    );
    return {
      postId: post.id,
      clubId: clubId,
      author: {
        id: post.authorId,
        name: post.authorName || "Người dùng",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
        role: "Thành viên",
      },
      content: post.content || "",
      images: imageMedia.map((m) => m.mediaUrl),
      imageIds: imageMedia.map((m) => m.id),
      timestamp: formatTimestamp(post.createdAt || new Date().toISOString()),
      likes: (post.likes || []).length,
      comments: (post.comments || []).length,
      shares: 0,
      // Thêm thông tin team để hiển thị badge
      teamId: post.teamId,
      teamName: post.teamName,
      isTeamPost: post.isTeamPost || !!post.teamId, // true nếu là post của team
    };
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Vừa xong";
    if (diffInHours < 24) return `${diffInHours} giờ trước`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;

    return date.toLocaleDateString("vi-VN");
  };

  const hasMore = currentPage < totalPages - 1;

  return (
    <div className="min-h-full bg-secondary/20">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <CreatePost onPostCreated={refreshPosts} clubId={clubId} />

        {/* Loading State - First Load */}
        {loading && posts.length === 0 && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-6">
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && posts.length === 0 && (
          <Card className="p-6 border-destructive/20">
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-destructive font-semibold">{error}</div>
                <button
                  onClick={refreshPosts}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        {posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                {...convertPostToCard(post)}
                onPostUpdated={refreshPosts}
                onPostDeleted={refreshPosts}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && !error && (
          <Card className="p-6">
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  Chưa có bài viết nào
                </div>
                <button
                  onClick={refreshPosts}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Tải lại
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {hasMore && (
          <div ref={sentinelRef} className="py-8 text-center">
            {loading && (
              <div className="animate-pulse text-muted-foreground">
                Đang tải thêm...
              </div>
            )}
          </div>
        )}

        {/* No More Posts */}
        {!loading && !hasMore && posts.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="text-muted-foreground text-sm">
              Đã hiển thị tất cả bài viết
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
