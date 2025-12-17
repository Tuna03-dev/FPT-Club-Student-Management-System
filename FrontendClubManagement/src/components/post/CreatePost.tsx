import { useState, useRef, useEffect } from "react";
import { Image, X, Edit2, Users, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeams } from "@/hooks/useTeams";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postService, type CreatePostRequest } from "@/services/postService";
import { toast } from "sonner";
import { authService } from "@/services/authService";

interface CreatePostProps {
  onPostCreated?: () => void;
  clubId?: number;
  teamId?: number; // If provided, post is for specific team
}

export const CreatePost = ({
  onPostCreated,
  clubId: clubIdProp,
  teamId: teamIdProp,
}: CreatePostProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clubId = clubIdProp ?? 1;

  // Get current user for avatar
  const currentUser = authService.getCurrentUser();

  // Post target: "club" or teamId
  const [postTarget, setPostTarget] = useState<string>(
    teamIdProp ? String(teamIdProp) : "club"
  );

  // Load teams and check if user is club officer
  const { data: teams } = useTeams(clubId);
  const { isClubOfficer } = useClubPermissions(clubId);

  // Filter teams: if club officer, show all; otherwise only show user's teams
  const availableTeams = isClubOfficer
    ? teams || []
    : (teams || []).filter((team) => team.myRoles && team.myRoles.length > 0);

  // Reset post target if teamIdProp changes
  useEffect(() => {
    if (teamIdProp) {
      setPostTarget(String(teamIdProp));
    }
  }, [teamIdProp]);

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

      const isClubWide = postTarget === "club";
      const targetTeamId = isClubWide ? undefined : Number(postTarget);

      const request: CreatePostRequest = {
        title: content.slice(0, 100) + "...",
        content: content.trim(),
        clubId,
        clubWide: isClubWide,
        withinClub: true,
        status: "PUBLISHED",
        ...(targetTeamId && { teamId: targetTeamId }),
      };

      await postService.createPostWithMedia(request, selectedFiles);

      toast.success("Đăng bài thành công!");

      // Reset form
      setContent("");
      setSelectedFiles([]);
      selectedImages.forEach((url) => URL.revokeObjectURL(url));
      setSelectedImages([]);
      setPostTarget(teamIdProp ? String(teamIdProp) : "club");
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
    selectedImages.forEach((url) => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPostTarget(teamIdProp ? String(teamIdProp) : "club");
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <Card className="p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src={currentUser?.avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentUser?.fullName?.charAt(0)?.toUpperCase() || "U"}
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
            <AvatarImage src={currentUser?.avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentUser?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            {/* Post Target Selector */}
            {!teamIdProp && availableTeams.length > 0 && (
              <div className="pb-3 border-b">
                <Select value={postTarget} onValueChange={setPostTarget}>
                  <SelectTrigger className="h-auto py-2 px-3 border-none shadow-none hover:bg-muted/50 transition-colors">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {postTarget === "club" ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Globe className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-sm">
                                Công khai
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Mọi người trong CLB
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-sm">
                                {availableTeams.find(
                                  (t) => t.teamId === Number(postTarget)
                                )?.teamName || "Ban"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Chỉ thành viên ban này
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-[300px]">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Chọn đối tượng xem bài viết
                    </div>
                    <SelectItem value="club" className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Globe className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Công khai</div>
                          <div className="text-xs text-muted-foreground">
                            Tất cả thành viên trong câu lạc bộ
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    {availableTeams.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                        Đăng vào ban cụ thể
                      </div>
                    )}
                    {availableTeams.map((team) => (
                      <SelectItem
                        key={team.teamId}
                        value={String(team.teamId)}
                        className="py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{team.teamName}</div>
                            <div className="text-xs text-muted-foreground">
                              {team.memberCount || 0} thành viên
                              {!isClubOfficer &&
                                team.myRoles &&
                                team.myRoles.length > 0 && (
                                  <span className="ml-1">
                                    • Bạn là thành viên
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
