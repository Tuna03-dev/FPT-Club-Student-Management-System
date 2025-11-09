import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

interface PostCardProps {
  author: {
    name: string;
    avatar?: string;
    role: string;
  };
  content: string;
  images?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  maxLength?: number; // Độ dài tối đa trước khi truncate
}

interface Reply {
  id: string;
  author: { name: string; avatar?: string };
  content: string;
  timestamp: string;
  likes: number;
}

interface Comment {
  id: string;
  author: { name: string; avatar?: string };
  content: string;
  timestamp: string;
  likes: number;
  replies: Reply[];
}

export const PostCard = ({
  author,
  content,
  images = [],
  timestamp,
  likes,
  comments,
  maxLength = 150,
}: PostCardProps) => {
  const { t } = useTranslation("common");
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<boolean[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [commentsList, setCommentsList] = useState<Comment[]>([
    {
      id: "1",
      author: { name: "Phạm Văn D", avatar: undefined },
      content: "Chúc mừng CLB! Hy vọng sẽ ngày càng phát triển hơn nữa! 🎉",
      timestamp: "1 giờ trước",
      likes: 12,
      replies: [
        {
          id: "1-1",
          author: { name: "Nguyễn Văn A", avatar: undefined },
          content:
            "Cảm ơn bạn! Hy vọng bạn sẽ tiếp tục đồng hành cùng chúng mình.",
          timestamp: "45 phút trước",
          likes: 5,
        },
      ],
    },
    {
      id: "2",
      author: { name: "Hoàng Thị E", avatar: undefined },
      content: "Tuyệt vời quá! 🎊",
      timestamp: "30 phút trước",
      likes: 8,
      replies: [],
    },
  ]);

  const shouldTruncate = content.length > maxLength;
  const displayContent =
    shouldTruncate && !isExpanded
      ? content.substring(0, maxLength) + "..."
      : content;

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  useEffect(() => {
    // reset image error state when images change
    setImageErrors(new Array(images.length).fill(false));
  }, [images]);

  const nextImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getGridLayout = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2";
    return "grid-cols-2";
  };
  return (
    <Card className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow py-0 gap-0 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-3">
        <div className="flex gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {author.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {author.name ?? "Người dùng"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {author.role} · {timestamp}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <p className="text-foreground whitespace-pre-wrap text-sm">
          {displayContent}
        </p>
        {shouldTruncate && (
          <Button
            variant="link"
            className="p-0 h-auto text-primary hover:text-primary/80 font-medium text-sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? t("post.seeLess") : t("post.seeMore")}
          </Button>
        )}
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className={`grid ${getGridLayout(images.length)} gap-0.5`}>
          {images.slice(0, 4).map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-square cursor-pointer overflow-hidden group"
              onClick={() => openLightbox(idx)}
            >
              {!imageErrors[idx] ? (
                <img
                  src={img}
                  alt={`Post image ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={() =>
                    setImageErrors((prev) => {
                      const copy = [...prev];
                      copy[idx] = true;
                      return copy;
                    })
                  }
                />
              ) : (
                <div className="w-full h-full bg-muted/40 flex items-center justify-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-xs">Ảnh không khả dụng</span>
                  </div>
                </div>
              )}

              {idx === 3 && images.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-3xl font-semibold">
                    +{images.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t border-border">
        <span>{likes} lượt thích</span>
        <div className="flex gap-3">
          <span>{comments} bình luận</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-border">
        <Button
          variant="ghost"
          className="flex-1 gap-1 rounded-none py-2"
          size="sm"
        >
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Thích</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 gap-1 rounded-none border-x border-border py-2"
          size="sm"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Bình luận</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border">
          <div className="max-h-96 overflow-auto">
            <div className="p-4 space-y-4">
              {/* Comment Input */}
              <div className="flex gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    T
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Textarea
                    placeholder="Viết bình luận..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={() => {
                      if (!commentText.trim()) return;
                      const newComment: Comment = {
                        id: Date.now().toString(),
                        author: { name: "Tôi", avatar: undefined },
                        content: commentText,
                        timestamp: "Vừa xong",
                        likes: 0,
                        replies: [],
                      };
                      setCommentsList([newComment, ...commentsList]);
                      setCommentText("");
                    }}
                    disabled={!commentText.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              {commentsList.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {comment.author.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="font-semibold text-sm">
                          {comment.author.name}
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground px-3">
                        <button className="hover:underline">
                          {comment.timestamp}
                        </button>
                        <button className="hover:underline font-semibold">
                          Thích ({comment.likes})
                        </button>
                        <button
                          className="hover:underline font-semibold"
                          onClick={() =>
                            setReplyingTo(
                              replyingTo === comment.id ? null : comment.id
                            )
                          }
                        >
                          Trả lời
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="ml-10 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={reply.author.avatar} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {reply.author.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-muted rounded-lg p-2.5">
                              <div className="font-semibold text-xs">
                                {reply.author.name}
                              </div>
                              <p className="text-xs mt-1">{reply.content}</p>
                            </div>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground px-2.5">
                              <button className="hover:underline">
                                {reply.timestamp}
                              </button>
                              <button className="hover:underline font-semibold">
                                Thích ({reply.likes})
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="ml-10 flex gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          T
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          placeholder={`Trả lời ${comment.author.name}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[50px] resize-none text-sm"
                        />
                        <Button
                          size="icon"
                          className="h-[50px]"
                          onClick={() => {
                            if (!replyText.trim()) return;
                            const newReply: Reply = {
                              id: Date.now().toString(),
                              author: { name: "Tôi", avatar: undefined },
                              content: replyText,
                              timestamp: "Vừa xong",
                              likes: 0,
                            };
                            setCommentsList(
                              commentsList.map((c) =>
                                c.id === comment.id
                                  ? { ...c, replies: [...c.replies, newReply] }
                                  : c
                              )
                            );
                            setReplyText("");
                            setReplyingTo(null);
                          }}
                          disabled={!replyText.trim()}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {!imageErrors[currentImageIndex] ? (
              <img
                src={images[currentImageIndex]}
                alt={`Image ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                onError={() =>
                  setImageErrors((prev) => {
                    const copy = [...prev];
                    copy[currentImageIndex] = true;
                    return copy;
                  })
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/40 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-10 w-10" />
                  <span>Ảnh không khả dụng</span>
                </div>
              </div>
            )}

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
