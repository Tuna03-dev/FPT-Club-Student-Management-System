import { CreatePost } from "@/components/features/post/CreatePost";
import { PostCard } from "@/components/features/post/PostCard";

// Mock data for posts
const mockPosts = [
  {
    id: "1",
    author: {
      name: "Nguyễn Văn An",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
      role: "Chủ tịch CLB",
    },
    content: "Chúc mừng các thành viên mới đã tham gia câu lạc bộ! Hãy cùng nhau xây dựng một cộng đồng năng động và sáng tạo. 🎉",
    timestamp: "2 giờ trước",
    likes: 45,
    comments: 12,
    shares: 3,
  },
  {
    id: "2",
    author: {
      name: "Trần Thị Bình",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
      role: "Phó chủ tịch",
    },
    content: "📢 Thông báo: Workshop \"Kỹ năng làm việc nhóm\" sẽ diễn ra vào thứ 7 tuần sau.\n\n📅 Thời gian: 14:00 - 17:00\n📍 Địa điểm: Hội trường A\n\nMọi người đăng ký tham gia nhé!",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
    timestamp: "5 giờ trước",
    likes: 82,
    comments: 24,
    shares: 15,
  },
  {
    id: "3",
    author: {
      name: "Lê Minh Cường",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
      role: "Ban Chuyên môn",
    },
    content: "Cảm ơn mọi người đã tham gia buổi họp hôm nay! Chúng ta đã có những quyết định quan trọng cho dự án sắp tới. 💪",
    timestamp: "1 ngày trước",
    likes: 34,
    comments: 8,
    shares: 2,
  },
  {
    id: "4",
    author: {
      name: "Phạm Thu Hà",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
      role: "Ban Truyền thông",
    },
    content: "🎨 Cuộc thi thiết kế Logo cho CLB đã chính thức bắt đầu!\n\nHạn nộp bài: 30/10/2024\nGiải thưởng: 5.000.000 VNĐ\n\nHãy thể hiện tài năng của bạn nhé! ✨",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    timestamp: "2 ngày trước",
    likes: 156,
    comments: 45,
    shares: 28,
  },
];

export const Dashboard = () => {
  return (
    <div className="min-h-full bg-secondary/20">
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        {/* Create Post */}
        <CreatePost />

        {/* Posts Feed */}
        <div className="space-y-4">
          {mockPosts.map((post) => (
            <PostCard
              key={post.id}
              author={post.author}
              content={post.content}
              image={post.image}
              timestamp={post.timestamp}
              likes={post.likes}
              comments={post.comments}
              shares={post.shares}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

