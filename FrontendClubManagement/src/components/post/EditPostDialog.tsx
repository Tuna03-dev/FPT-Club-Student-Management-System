import { useState, useRef, useEffect } from "react";
import { Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postService, type UpdatePostRequest } from "@/services/postService";
import { toast } from "sonner";

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: number;
  clubId: number;
  initialContent: string;
  initialImages?: Array<{ url: string; id?: number }>; // URLs and IDs of existing images
  onPostUpdated?: () => void;
}

export const EditPostDialog = ({
  open,
  onOpenChange,
  postId,
  clubId,
  initialContent,
  initialImages = [],
  onPostUpdated,
}: EditPostDialogProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [existingImages, setExistingImages] = useState<Array<{ url: string; id?: number }>>(
    initialImages || []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [deleteMediaIds, setDeleteMediaIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens/closes or initial values change
  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setExistingImages(initialImages || []);
      setNewFiles([]);
      setNewImagePreviews([]);
      setDeleteMediaIds([]);
    }
  }, [open, initialContent, initialImages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setNewFiles((prev) => [...prev, ...files]);

    // Create previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setNewImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (index: number) => {
    const image = existingImages[index];
    if (image.id) {
      setDeleteMediaIds((prev) => [...prev, image.id!]);
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung bài viết");
      return;
    }

    setIsUpdating(true);
    try {
      const updateRequest: UpdatePostRequest = {
        clubId,
        content: content.trim(),
        deleteMediaIds: deleteMediaIds.length > 0 ? deleteMediaIds : undefined,
        newMediasMeta: newFiles.map((_, index) => ({
          displayOrder: existingImages.length + index,
          mediaType: "IMAGE",
        })),
      };

      const response = await postService.updatePost(
        postId,
        updateRequest,
        newFiles.length > 0 ? newFiles : undefined
      );

      if (response.code === 200) {
        toast.success("Đã cập nhật bài viết");
        onPostUpdated?.();
        onOpenChange(false);
      } else {
        toast.error("Không thể cập nhật bài viết");
      }
    } catch (error) {
      console.error("Failed to update post:", error);
      toast.error("Không thể cập nhật bài viết");
    } finally {
      setIsUpdating(false);
    }
  };

  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    return "grid-cols-2";
  };

  // const allImages = [...existingImages, ...newImagePreviews.map(url => ({ url }))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa bài viết</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Nội dung</Label>
            <Textarea
              id="content"
              placeholder="Bạn đang nghĩ gì?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              required
            />
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <Label>Ảnh hiện tại</Label>
              <div className={`grid ${getGridClass(existingImages.length)} gap-2`}>
                {existingImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={`Existing ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeExistingImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Images Preview */}
          {newImagePreviews.length > 0 && (
            <div className="space-y-2">
              <Label>Ảnh mới</Label>
              <div className={`grid ${getGridClass(newImagePreviews.length)} gap-2`}>
                {newImagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`New ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeNewImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Images Button */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleImageButtonClick}
              className="flex items-center gap-2"
            >
              <Image className="h-4 w-4" />
              Thêm ảnh
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isUpdating || !content.trim()}>
              {isUpdating ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

