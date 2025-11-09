import { useState, useRef } from "react";
import { Image, X, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postService, type CreatePostRequest } from "@/services/postService";
import { toast } from "sonner";

interface CreatePostProps {
  onPostCreated?: () => void;
  clubId?: number;
}

export const CreatePost = ({
  onPostCreated,
  clubId: clubIdProp,
}: CreatePostProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [clubWide, setClubWide] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clubId = clubIdProp ?? 1; // prefer prop, fallback to 1

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);

    // Create URLs for preview
    const newImages = files.map((file) => URL.createObjectURL(file));
    setSelectedImages((prev) => [...prev, ...newImages]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedImages((prev) => {
      // Revoke the object URL
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    return "grid-cols-2";
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...selectedFiles];
    const newImages = [...selectedImages];
    const draggedFile = newFiles[draggedIndex];
    const draggedImage = newImages[draggedIndex];

    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setSelectedFiles(newFiles);
    setSelectedImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung bài viết");
      return;
    }

    try {
      setIsCreating(true);

      const request: CreatePostRequest = {
        // Autogenerate a title from the content since we don't collect title in the UI
        title: content.slice(0, 100) + "...",
        content: content.trim(),
        clubId,
        clubWide,
        withinClub: true,
        status: "PUBLISHED", // Set status to published when posting
      };

      await postService.createPostWithMedia(request, selectedFiles);

      toast.success("Đăng bài thành công!");

      // Reset form
      setContent("");
      setSelectedFiles([]);
      // Clean up object URLs
      selectedImages.forEach((url) => URL.revokeObjectURL(url));
      setSelectedImages([]);
      setClubWide(true);
      setShowForm(false);

      // Notify parent component
      onPostCreated?.();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Có lỗi khi đăng bài");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setContent("");
    setSelectedFiles([]);
    // Clean up object URLs
    selectedImages.forEach((url) => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setClubWide(true);
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <Card className="p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              CP
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 text-left px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-full text-muted-foreground transition-colors"
          >
            Bạn đang nghĩ gì?
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 shadow-soft">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              CP
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="content">Nội dung *</Label>
              <Textarea
                id="content"
                placeholder="Bạn đang nghĩ gì?"
                className="min-h-[80px] resize-none border-muted mt-1"
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setContent(e.target.value)
                }
                required
              />
            </div>

            {/* Image Preview Grid - Show max 4 images */}
            {selectedImages.length > 0 && (
              <div className="relative">
                <div
                  className={`grid gap-2 ${getGridClass(
                    Math.min(selectedImages.length, 4)
                  )}`}
                >
                  {selectedImages.slice(0, 4).map((image, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Show +X overlay on 4th image if more than 4 images */}
                      {index === 3 && selectedImages.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-3xl font-semibold">
                            +{selectedImages.length - 4}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Edit button to open dialog */}
                {selectedImages.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                    Chỉnh sửa ảnh ({selectedImages.length})
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  onClick={handleImageButtonClick}
                >
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Ảnh</span>
                </Button>
                {/* Cảm xúc removed */}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCreating}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !content.trim()}
                  className="bg-primary text-primary-foreground"
                >
                  {isCreating ? "Đang đăng..." : "Đăng"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Edit Images Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa ảnh ({selectedImages.length})</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {selectedImages.map((image, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group aspect-square overflow-hidden rounded-lg bg-muted cursor-move transition-opacity ${
                  draggedIndex === index ? "opacity-50" : "opacity-100"
                }`}
              >
                <img
                  src={image}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm">
                    Ảnh {index + 1} - Kéo để sắp xếp
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
