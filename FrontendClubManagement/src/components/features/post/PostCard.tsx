import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useState } from "react";

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
  maxLength?: number; // Độ dài tối đa trước khi truncate
}

export const PostCard = ({
  author,
  content,
  image,
  timestamp,
  likes,
  comments,
  maxLength = 150,
}: PostCardProps) => {
  const { t } = useTranslation("common");
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = content.length > maxLength;
  const displayContent =
    shouldTruncate && !isExpanded
      ? content.substring(0, maxLength) + "..."
      : content;
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
        <p className="text-foreground whitespace-pre-wrap">{displayContent}</p>
        {shouldTruncate && (
          <Button
            variant="link"
            className="p-0 h-auto text-primary hover:text-primary/80 font-medium"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? t("post.seeLess") : t("post.seeMore")}
          </Button>
        )}
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
        <span>
          {likes} {t("post.likes")}
        </span>
        <div className="flex gap-3">
          <span>
            {comments} {t("post.comments")}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-border">
        <Button variant="ghost" className="flex-1 gap-2 rounded-none" size="sm">
          <Heart className="h-5 w-5" />
          <span className="hidden sm:inline">{t("post.like")}</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 gap-2 rounded-none border-x border-border"
          size="sm"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">{t("post.comment")}</span>
        </Button>
      </div>
    </Card>
  );
};
