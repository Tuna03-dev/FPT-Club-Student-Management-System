import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PostCardProps {
  author: {
    name: string;
    avatar?: string;
    role: string;
  };
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

export const PostCard = ({
  author,
  content,
  image,
  timestamp,
  likes,
  comments,
  shares,
}: PostCardProps) => {
  return (
    <Card className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow py-0 gap-0">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{author.name}</h3>
            <p className="text-sm text-muted-foreground">
              {author.role} · {timestamp}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-foreground whitespace-pre-wrap">{content}</p>
      </div>

      {/* Image */}
      {image && (
        <div className="relative w-full">
          <img
            src={image}
            alt="Post content"
            className="w-full object-cover max-h-96"
          />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-t border-border">
        <span>{likes} lượt thích</span>
        <div className="flex gap-3">
          <span>{comments} bình luận</span>
          <span>{shares} chia sẻ</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-border">
        <Button variant="ghost" className="flex-1 gap-2 rounded-none" size="sm">
          <Heart className="h-5 w-5" />
          <span className="hidden sm:inline">Thích</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 gap-2 rounded-none border-x border-border"
          size="sm"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Bình luận</span>
        </Button>
        <Button variant="ghost" className="flex-1 gap-2 rounded-none" size="sm">
          <Share2 className="h-5 w-5" />
          <span className="hidden sm:inline">Chia sẻ</span>
        </Button>
      </div>
    </Card>
  );
};
