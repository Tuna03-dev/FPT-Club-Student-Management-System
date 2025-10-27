import { useState, useEffect } from "react";
import { CreatePost } from "@/components/features/post/CreatePost";
import { PostCard } from "@/components/features/post/PostCard";
import { postService, type PostWithRelationsData } from "@/services/postService";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const Dashboard = () => {
  const [posts, setPosts] = useState<PostWithRelationsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const clubId = 1; // TODO: Get from context/route

  const loadPosts = async (pageNum: number = 0, reset: boolean = true) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postService.getClubWidePosts(clubId, {
        page: pageNum,
        size: 10,
        sort: "createdAt,desc",
      });

      if (response.code === 200 && response.data) {
        const newPosts = response.data.content;
        if (reset) {
          setPosts(newPosts);
        } else {
          setPosts(prev => [...prev, ...newPosts]);
        }
        setHasMore(response.data.hasNext);
        setPage(pageNum);
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
    }
  };

  useEffect(() => {
    loadPosts(0, true);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      loadPosts(page + 1, false);
    }
  };

  const refreshPosts = () => {
    loadPosts(0, true);
  };

  const convertPostToCard = (post: PostWithRelationsData) => ({
    id: post.id.toString(),
    author: {
      name: post.authorName || "Người dùng",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=default", // Default avatar
      role: "Thành viên", // Default role
    },
    content: post.content || "",
    images: (post.media || [])
      .filter(m => m && m.mediaType === "IMAGE")
      .map(m => m.mediaUrl), // Get all images
    timestamp: formatTimestamp(post.createdAt || new Date().toISOString()),
    likes: (post.likes || []).length,
    comments: (post.comments || []).length,
    shares: 0, // Backend doesn't have shares field, using default
  });

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Vừa xong";
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-h-full bg-secondary/20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Create Post */}
        <CreatePost onPostCreated={refreshPosts} />

        {/* Loading State */}
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
        {error && (
          <Card className="p-6 border-destructive/20">
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-destructive font-semibold">
                  {error}
                </div>
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
        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                {...convertPostToCard(post)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && posts.length === 0 && (
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

        {/* Load More Button */}
        {!loading && hasMore && posts.length > 0 && (
          <div className="flex justify-center pt-4">
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Tải thêm
            </button>
          </div>
        )}

        {/* Loading More State */}
        {loading && posts.length > 0 && (
          <div className="flex justify-center pt-4">
            <div className="text-muted-foreground">Đang tải...</div>
          </div>
        )}
      </div>
    </div>
  );
};