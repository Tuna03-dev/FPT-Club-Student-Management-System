import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  shares: number;
  maxLength?: number; // Độ dài tối đa trước khi truncate
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
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
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
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Bình luận</span>
        </Button>
      </div>

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
