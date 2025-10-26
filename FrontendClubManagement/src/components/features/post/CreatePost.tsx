import { useState } from "react";
import { Image, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postService, type CreatePostRequest } from "@/services/postService";
import { toast } from "sonner";

interface CreatePostProps {
  onPostCreated?: () => void;
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [clubWide, setClubWide] = useState(true);

  const clubId = 1; // TODO: Get from context/route

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
        title: title.trim() || content.slice(0, 100) + "...",
        content: content.trim(),
        clubId,
        clubWide,
        withinClub: true,
      };

      await postService.createPostWithMedia(request, selectedFiles);
      
      toast.success("Đăng bài thành công!");
      
      // Reset form
      setTitle("");
      setContent("");
      setSelectedFiles([]);
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
    setTitle("");
    setContent("");
    setSelectedFiles([]);
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
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              CP
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="title">Tiêu đề (tùy chọn)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài viết..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="content">Nội dung *</Label>
              <textarea
                id="content"
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                placeholder="Bạn đang nghĩ gì?"
                className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
          </div>
        </div>

        {/* File Preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>File đã chọn:</Label>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
              className="gap-2 text-muted-foreground hover:bg-secondary"
            >
              <Image className="h-4 w-4" />
              <span>Thêm file</span>
            </Button>
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
            >
              {isCreating ? "Đang đăng..." : "Đăng bài"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

