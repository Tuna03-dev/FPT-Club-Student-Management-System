import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Send,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  X,
  Trash2,
  Edit,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import commentService, { type CommentDTO } from "@/services/commentService";
import likeService from "@/services/likeService";
import { authService } from "@/services/authService";
import { useWebSocket, type WebSocketMessage } from "@/hooks/useWebSocket";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { postService } from "@/services/postService";
import { EditPostDialog } from "./EditPostDialog";

interface PostCardProps {
  postId: number;
  clubId?: number;
  author: {
    id?: number; // Author ID for permission check
    name: string;
    avatar?: string;
    role: string;
  };
  content: string;
  images?: string[]; // Image URLs
  imageIds?: number[]; // Media IDs for deletion (optional, same order as images)
  timestamp: string;
  likes: number;
  comments: number;
  maxLength?: number;
  onPostUpdated?: () => void; // Callback when post is updated
  onPostDeleted?: () => void; // Callback when post is deleted
  // Team info
  teamId?: number;
  teamName?: string;
  isTeamPost?: boolean; // true if post belongs to a specific team
  // Notification scroll
  highlightCommentId?: string; // Auto-open comments and highlight this comment
}

export const PostCard = ({
  postId,
  clubId,
  author,
  content,
  images = [],
  imageIds = [],
  timestamp,
  likes,
  comments: initialCommentsCount, // Used for display count before loading
  maxLength = 150,
  onPostUpdated,
  onPostDeleted,
  teamId,
  teamName,
  isTeamPost = false,
  highlightCommentId,
}: PostCardProps) => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<boolean[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null); // Where to show the input (root comment)
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null); // Actual comment being replied to
  const [replyText, setReplyText] = useState("");
  const [replyTargetName, setReplyTargetName] = useState<string | null>(null);
  const replyInputRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [commentsList, setCommentsList] = useState<CommentDTO[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isDeletePostDialogOpen, setIsDeletePostDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // --- THÊM STATE CHO DIALOG XÓA COMMENT ---
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  // --- COMMENT COUNT TRACKING ---
  const [commentCount, setCommentCount] = useState(initialCommentsCount);
  // --- LIKE STATE ---
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const deleteTargetIsReply = commentsList
    .flatMap((c) => c.replies || [])
    .find((rep) => rep.id === deleteCommentId);

  // 1. Tạo ref cho Textarea editing
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const currentUser = authService.getCurrentUser();
  const canEditPost =
    currentUser?.id && author.id && currentUser.id === author.id;
  const token = localStorage.getItem("accessToken");
  const { isConnected, subscribeToClub, send } = useWebSocket(token);

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return dateString;
    }
  };

  // Helper function to find parent comment in tree
  const findParentComment = useCallback(
    (parentId: number, comments: CommentDTO[]): CommentDTO | null => {
      for (const comment of comments) {
        if (comment.id === parentId) {
          return comment;
        }
        if (comment.replies) {
          const found = findParentComment(parentId, comment.replies);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  // Load comments
  const loadComments = useCallback(async () => {
    if (!postId) return;
    setLoadingComments(true);
    try {
      const response = await commentService.getAllFlat(postId);
      if (response.code === 200 && response.data) {
        // Group flat comments by root parent (no tree building)
        const flatComments = response.data;
        

        // Separate root comments and group replies
        const rootComments: CommentDTO[] = [];
        const replyGroups = new Map<number, CommentDTO[]>();

        flatComments.forEach((comment) => {
          if (comment.parentId === null) {
            // This is a root comment
            comment.replies = [];
            rootComments.push(comment);
          } else {
            // This is a reply - group by root parent
            const rootId = comment.rootParentId || comment.parentId;
            

            if (!replyGroups.has(rootId)) {
              replyGroups.set(rootId, []);
            }
            replyGroups.get(rootId)!.push(comment);
          }
        });

        // Attach grouped replies to root comments
        rootComments.forEach((root) => {
          root.replies = replyGroups.get(root.id) || [];
        });

        console.log("🌲 Built structure:", rootComments);
        console.log("📊 Reply groups:", replyGroups);
        setCommentsList(rootComments);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
      toast.error("Không thể tải bình luận");
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  // Load initial like status
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const response = await likeService.isLikedByMe(postId);
        if (response.code === 200 && response.data !== undefined) {
          setIsLiked(response.data);
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };

    checkLikeStatus();
  }, [postId]);

  // Load comments immediately on mount to get accurate count
  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId, loadComments]);

  // Update comment count when comments list changes
  useEffect(() => {
    const totalCount = commentsList.reduce(
      (total, c) => total + 1 + (c.replies?.length || 0),
      0
    );
    setCommentCount(totalCount);
  }, [commentsList]);

  // Auto-open comments and highlight when coming from notification
  useEffect(() => {
    if (highlightCommentId && commentsList.length > 0) {
      // Open comments section
      setShowComments(true);

      // Wait for DOM to update, then scroll to comment
      setTimeout(() => {
        const commentElement = document.getElementById(
          `comment-${highlightCommentId}`
        );
        if (commentElement) {
          commentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // Add highlight effect
          commentElement.classList.add(
            "ring-2",
            "ring-primary",
            "ring-offset-2",
            "bg-primary/5"
          );
          setTimeout(() => {
            commentElement.classList.remove(
              "ring-2",
              "ring-primary",
              "ring-offset-2",
              "bg-primary/5"
            );
          }, 3000);
        }
      }, 300);
    }
  }, [highlightCommentId, commentsList]);

  // WebSocket subscription for realtime updates
  useEffect(() => {
    if (!isConnected || !clubId) return;

    const unsubscribe = subscribeToClub(clubId, (message: WebSocketMessage) => {
      if (message.type === "POST" && message.payload) {
        const payload = message.payload as
          | { comment: CommentDTO; postId: number; action: string }
          | {
              postId: number;
              userId: number;
              liked: boolean;
              totalLikes: number;
            };

        // Handle like updates
        if (
          message.action === "UPDATED" &&
          "totalLikes" in payload &&
          payload.postId === postId
        ) {
          // Real-time like update from other users or same user on different device
          setLikeCount(payload.totalLikes);

          // If current user liked/unliked from another device, update isLiked
          if (currentUser && payload.userId === currentUser.id) {
            setIsLiked(payload.liked);
          }
        }

        // Handle comment updates
        if (!("comment" in payload) || payload.postId !== postId) return;

        if (message.action === "COMMENT_NEW") {
          // Add new comment to list
          setCommentsList((prev) => {
            const exists = prev.some((c) => c.id === payload.comment.id);
            if (exists) return prev;

            if (payload.comment.parentId === null) {
              return [payload.comment, ...prev];
            } else {
              // Add as reply - use rootParentId if it has value, otherwise use parentId
              const targetParentId =
                payload.comment.rootParentId || payload.comment.parentId;
              return prev.map((c) => {
                if (c.id === targetParentId) {
                  return {
                    ...c,
                    replies: [...(c.replies || []), payload.comment],
                  };
                }
                return c;
              });
            }
          });
          // Increment comment count
          setCommentCount((prev) => prev + 1);
        } else if (message.action === "COMMENT_EDIT") {
          // Update comment - merge fields and preserve replies array to avoid losing nested replies
          setCommentsList((prev) => {
            const mergeComment = (
              old: CommentDTO | undefined,
              updated: CommentDTO
            ) => {
              return {
                ...(old || {}),
                ...updated,
                replies: (old && old.replies) || updated.replies || [],
              } as CommentDTO;
            };

            const updateComment = (comments: CommentDTO[]): CommentDTO[] => {
              return comments.map((c) => {
                if (c.id === payload.comment.id) {
                  return mergeComment(c, payload.comment);
                }
                if (c.replies) {
                  return { ...c, replies: updateComment(c.replies) };
                }
                return c;
              });
            };

            return updateComment(prev);
          });
        } else if (message.action === "COMMENT_DELETE") {
          // Remove comment and decrement count
          setCommentsList((prev) => {
            const removeComment = (comments: CommentDTO[]): CommentDTO[] => {
              return comments
                .filter((c) => c.id !== payload.comment.id)
                .map((c) => {
                  if (c.replies) {
                    return { ...c, replies: removeComment(c.replies) };
                  }
                  return c;
                });
            };
            return removeComment(prev);
          });
          // Decrement comment count
          setCommentCount((prev) => Math.max(0, prev - 1));
        }
      }
    });

    return unsubscribe;
  }, [isConnected, clubId, postId, showComments, subscribeToClub, currentUser]);

  // Handle create comment
  const handleCreateComment = useCallback(async () => {
    if (!commentText.trim() || !currentUser?.id || !postId) return;

    setSubmittingComment(true);
    try {
      const response = await commentService.create(postId, {
        userId: currentUser.id,
        content: commentText.trim(),
        parentId: null,
      });

      if (response.code === 200 && response.data) {
        setCommentText("");
        // WebSocket will handle the update, no need to reload
        toast.success("Đã thêm bình luận");
      } else {
        toast.error("Không thể tạo bình luận");
      }
    } catch (error) {
      console.error("Failed to create comment:", error);
      toast.error("Không thể tạo bình luận");
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, currentUser, postId]);

  // Handle create reply
  const handleCreateReply = useCallback(async () => {
    if (!replyText.trim() || !currentUser?.id || !postId || !replyTargetId)
      return;

    setSubmittingComment(true);
    try {
      const response = await commentService.create(postId, {
        userId: currentUser.id,
        content: replyText.trim(),
        parentId: replyTargetId, // Use the actual comment id being replied to
      });

      if (response.code === 200 && response.data) {
        setReplyText("");
        setReplyingTo(null);
        setReplyTargetId(null);
        setReplyTargetName(null);
        // WebSocket will handle the update, no need to reload
        toast.success("Đã thêm phản hồi");
      } else {
        toast.error("Không thể tạo phản hồi");
      }
    } catch (error) {
      console.error("Failed to create reply:", error);
      toast.error("Không thể tạo phản hồi");
    } finally {
      setSubmittingComment(false);
    }
  }, [replyText, currentUser, postId, replyTargetId]);

  // Handle edit comment
  const handleEditComment = useCallback(
    async (commentId: number) => {
      if (!editText.trim()) return;

      setSubmittingComment(true);
      try {
        const response = await commentService.edit(commentId, {
          content: editText.trim(),
        });

        if (response.code === 200 && response.data) {
          const updatedComment = response.data;

          // Optimistically update local comment tree (merge to preserve replies)
          setCommentsList((prev) => {
            const mergeComment = (
              old: CommentDTO | undefined,
              updated: CommentDTO
            ) => {
              return {
                ...(old || {}),
                ...updated,
                replies: (old && old.replies) || updated.replies || [],
              } as CommentDTO;
            };

            const updateComment = (comments: CommentDTO[]): CommentDTO[] => {
              return comments.map((c) => {
                if (c.id === updatedComment.id) {
                  return mergeComment(c, updatedComment);
                }
                if (c.replies) {
                  return { ...c, replies: updateComment(c.replies) };
                }
                return c;
              });
            };

            return updateComment(prev);
          });

          // If connected, publish edit event to club topic so other clients receive it
          try {
            if (isConnected && send && clubId) {
              send(`/topic/club/${clubId}`, {
                type: "POST",
                action: "COMMENT_EDIT",
                payload: { comment: updatedComment, postId },
              });
            }
          } catch (err) {
            // Non-fatal; just log
            console.warn("Failed to send websocket edit message", err);
          }

          setEditingCommentId(null);
          setEditText("");
        } else {
          toast.error("Không thể sửa bình luận");
        }
      } catch (error) {
        console.error("Failed to edit comment:", error);
        toast.error("Không thể sửa bình luận");
      } finally {
        setSubmittingComment(false);
      }
    },
    [editText, clubId, isConnected, postId, send]
  );

  // SỬA LẠI handleDeleteComment: KHÔNG confirm, chỉ xóa với id được truyền (hứng từ dialog)
  const handleDeleteComment = useCallback(async (commentId: number) => {
    try {
      const response = await commentService.delete(commentId);
      if (response.code === 200) {
        toast.success("Đã xóa bình luận!");
      } else {
        toast.error("Không thể xóa bình luận");
      }
    } catch (error) {
      console.log("Failed to delete comment:", error);
      toast.error("Không thể xóa bình luận");
    }
  }, []);

  // Handle reply click - auto tag
  const handleReplyClick = useCallback(
    (comment: CommentDTO, rootCommentId: number) => {
      console.log("🔘 handleReplyClick:", {
        commentId: comment.id,
        parentId: comment.parentId,
        rootParentId: comment.rootParentId,
        passedRootId: rootCommentId,
        userName: comment.userName,
      });

      // Use the passed rootCommentId to determine where reply input should appear
      const inputLocationId = rootCommentId;

      console.log(
        "📍 Setting replyingTo:",
        inputLocationId,
        "replyTargetId:",
        comment.id
      );
      console.log(
        "📋 Current refs map has keys:",
        Array.from(replyInputRefs.current.keys())
      );

      setReplyingTo(inputLocationId); // Where to show the input (root comment)
      setReplyTargetId(comment.id); // Actual comment being replied to
      setReplyTargetName(comment.userName);
      setReplyText(`@${comment.userName} `);

      // Scroll to reply input after a short delay to ensure it's rendered
      setTimeout(() => {
        const inputElement = replyInputRefs.current.get(inputLocationId);
        console.log(
          "🔍 Looking for input element with id:",
          inputLocationId,
          "found:",
          !!inputElement
        );
        inputElement?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    },
    []
  );

  // Handle toggle like - Facebook-like instant response
  const handleToggleLike = useCallback(async () => {
    if (isLiking) return;

    // Capture current state for rollback
    const previousIsLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update - instant UI response
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likeCount + 1 : likeCount - 1;
    setIsLiked(newIsLiked);
    setLikeCount(newCount);
    setIsLiking(true);

    // Call API in background (non-blocking)
    try {
      const response = await likeService.toggleLike(postId);

      if (response.code === 200 && response.data) {
        // Sync with server data if different
        setIsLiked(response.data.liked);
        setLikeCount(response.data.count);
      } else {
        // Revert on error
        setIsLiked(previousIsLiked);
        setLikeCount(previousCount);
        toast.error("Không thể thực hiện thao tác");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, isLiked, likeCount, postId]);

  // Handle delete post click - open dialog
  const handleDeletePostClick = useCallback(() => {
    setIsDeletePostDialogOpen(true);
  }, []);

  // Handle confirm delete post
  const handleConfirmDeletePost = useCallback(async () => {
    setIsDeletingPost(true);
    try {
      const response = await postService.deletePost(postId);
      if (response.code === 200) {
        toast.success("Đã xóa bài viết");
        setIsDeletePostDialogOpen(false);
        onPostDeleted?.();
      } else {
        toast.error("Không thể xóa bài viết");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast.error("Không thể xóa bài viết");
    } finally {
      setIsDeletingPost(false);
    }
  }, [postId, onPostDeleted]);

  const shouldTruncate = content.length > maxLength;
  const displayContent =
    shouldTruncate && !isExpanded
      ? content.substring(0, maxLength) + "..."
      : content;

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    setImageErrors(new Array(images.length).fill(false));
  }, [images]);

  useEffect(() => {
    if (!lightboxOpen) {
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [lightboxOpen, currentImageIndex]);

  const nextImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 0.5, 1));
    if (imageZoom <= 1.5) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const getGridLayout = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2";
    return "grid-cols-2";
  };

  // 2. Khi mở edit comment, focus + select ngay Textarea
  useEffect(() => {
    if (editingCommentId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.select();
    }
  }, [editingCommentId]);

  return (
    <Card className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow py-0 gap-0 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-4 sm:p-5">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {author.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                {author.name ?? "Người dùng"}
              </h3>
              {isTeamPost && teamName && (
                <>
                  <span className="text-muted-foreground text-xs">›</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (clubId && teamId) {
                        navigate(`/myclub/${clubId}/teams/${teamId}`);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/60 rounded-md hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium text-foreground text-xs sm:text-sm">
                      {teamName}
                    </span>
                  </button>
                </>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {timestamp}
            </p>
          </div>
        </div>
        {canEditPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDeletePostClick}
                disabled={isDeletingPost}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeletingPost ? "Đang xóa..." : "Xóa"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-5 pb-3">
        <p className="text-foreground whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
          {displayContent}
        </p>
        {shouldTruncate && (
          <Button
            variant="link"
            className="p-0 h-auto text-primary hover:text-primary/80 font-medium text-sm sm:text-base mt-1"
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
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 text-xs sm:text-sm text-muted-foreground border-t border-border">
        <span>{likeCount} lượt thích</span>
        <div className="flex gap-3">
          <span>{commentCount} bình luận</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-border">
        <Button
          variant="ghost"
          className={`flex-1 gap-2 rounded-none py-2.5 sm:py-3 transition-all duration-200 ease-in-out ${
            isLiked
              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              : "hover:bg-accent"
          }`}
          size="sm"
          onClick={handleToggleLike}
          disabled={isLiking}
        >
          <Heart
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-200 ease-in-out ${
              isLiked ? "fill-current scale-110" : "scale-100"
            }`}
          />
          <span className="text-sm sm:text-base font-medium">
            {isLiked ? "Đã thích" : "Thích"}
          </span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 gap-2 rounded-none border-x border-border py-2.5 sm:py-3 transition-all duration-200 hover:bg-accent"
          size="sm"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200" />
          <span className="text-sm sm:text-base font-medium">Bình luận</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border">
          <div className="max-h-96 overflow-auto">
            <div className="p-4 sm:p-5 space-y-4">
              {/* Comment Input */}
              {currentUser && (
                <div className="flex gap-2 sm:gap-3">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarImage src={currentUser.avatarUrl} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {currentUser.fullName?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Viết bình luận..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleCreateComment();
                        }
                      }}
                      className="min-h-[60px] resize-none text-sm sm:text-base"
                    />
                    <Button
                      size="icon"
                      onClick={handleCreateComment}
                      disabled={!commentText.trim() || submittingComment}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {loadingComments ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="flex gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : commentsList.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                </div>
              ) : (
                commentsList.map((comment) => (
                  <div
                    key={comment.id}
                    id={`comment-${comment.id}`}
                    className="space-y-2 transition-all duration-300 rounded-lg"
                  >
                    <div className="flex gap-2 sm:gap-3">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        <AvatarImage src={comment.userAvatar || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                          {comment.userName?.charAt(0) ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="font-semibold text-sm sm:text-base">
                            {comment.userName}
                            {comment.edited && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (đã chỉnh sửa)
                              </span>
                            )}
                          </div>

                          {/* Inline edit like Facebook: show textarea inside bubble when editing */}
                          {editingCommentId === comment.id ? (
                            <div className="mt-2">
                              <Textarea
                                ref={editTextareaRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[54px] resize-none text-sm"
                              />
                              <div className="flex gap-2 justify-end mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={
                                    !editText.trim() || submittingComment
                                  }
                                >
                                  Lưu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditText("");
                                  }}
                                >
                                  Hủy
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm sm:text-base mt-1 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs sm:text-sm text-muted-foreground px-3">
                          <span>{formatTimestamp(comment.createdAt)}</span>
                          <button
                            className="hover:underline font-semibold"
                            onClick={() =>
                              handleReplyClick(comment, comment.id)
                            }
                          >
                            Trả lời
                          </button>
                          {currentUser?.id === comment.userId && (
                            <>
                              <button
                                className="hover:underline font-semibold"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditText(comment.content);
                                }}
                              >
                                <Edit className="h-3 w-3 inline mr-1" />
                                Sửa
                              </button>
                              <button
                                className="hover:underline font-semibold text-destructive"
                                onClick={() => setDeleteCommentId(comment.id)}
                              >
                                <Trash2 className="h-3 w-3 inline mr-1" />
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* removed separate edit block; edit UI now inline inside bubble */}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 sm:ml-12 space-y-2">
                        {comment.replies.map((reply) => (
                          <div
                            key={reply.id}
                            id={`comment-${reply.id}`}
                            className="flex gap-2 transition-all duration-300 rounded-lg"
                          >
                            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                              <AvatarImage
                                src={reply.userAvatar || undefined}
                              />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {reply.userName?.charAt(0) ?? "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="bg-muted rounded-lg p-2.5">
                                <div className="font-semibold text-xs sm:text-sm">
                                  {reply.userName}
                                  {reply.edited && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (đã chỉnh sửa)
                                    </span>
                                  )}
                                </div>
                                {reply.parentId &&
                                  reply.parentId !== comment.id &&
                                  (() => {
                                    const parentComment = findParentComment(
                                      reply.parentId,
                                      commentsList
                                    );
                                    if (parentComment) {
                                      return (
                                        <div className="text-xs text-muted-foreground">
                                          Trả lời{" "}
                                          <span className="font-medium text-primary">
                                            @{parentComment.userName}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                {/* Inline edit for reply (Facebook-like) */}
                                {editingCommentId === reply.id ? (
                                  <div className="mt-1">
                                    <Textarea
                                      ref={editTextareaRef}
                                      value={editText}
                                      onChange={(e) =>
                                        setEditText(e.target.value)
                                      }
                                      className="min-h-[46px] resize-none text-sm"
                                    />
                                    <div className="flex gap-2 justify-end mt-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleEditComment(reply.id)
                                        }
                                        disabled={
                                          !editText.trim() || submittingComment
                                        }
                                      >
                                        Lưu
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditText("");
                                        }}
                                      >
                                        Hủy
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs sm:text-sm mt-1 whitespace-pre-wrap">
                                    {reply.content}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-3 mt-1 text-xs text-muted-foreground px-2.5">
                                <span>{formatTimestamp(reply.createdAt)}</span>
                                <button
                                  className="hover:underline font-semibold"
                                  onClick={() =>
                                    handleReplyClick(reply, comment.id)
                                  }
                                >
                                  Trả lời
                                </button>
                                {currentUser?.id === reply.userId && (
                                  <>
                                    <button
                                      className="hover:underline font-semibold"
                                      onClick={() => {
                                        setEditingCommentId(reply.id);
                                        setEditText(reply.content);
                                      }}
                                    >
                                      <Edit className="h-3 w-3 inline mr-1" />
                                      Sửa
                                    </button>
                                    <button
                                      className="hover:underline font-semibold text-destructive"
                                      onClick={() =>
                                        setDeleteCommentId(reply.id)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3 inline mr-1" />
                                      Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* removed separate reply edit block; handled inline above */}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <div
                        ref={(el) => {
                          if (el) {
                            replyInputRefs.current.set(comment.id, el);
                          } else {
                            replyInputRefs.current.delete(comment.id);
                          }
                        }}
                        className="ml-8 sm:ml-12 flex gap-2 mt-2"
                      >
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                          <AvatarImage src={currentUser?.avatarUrl} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {currentUser?.fullName?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                          <Textarea
                            placeholder={`Trả lời ${
                              replyTargetName || comment.userName
                            }...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                (e.metaKey || e.ctrlKey)
                              ) {
                                e.preventDefault();
                                handleCreateReply();
                              }
                            }}
                            className="min-h-[50px] resize-none text-sm"
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleCreateReply()}
                              disabled={!replyText.trim() || submittingComment}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyTargetId(null);
                                setReplyText("");
                                setReplyTargetName(null);
                              }}
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox with Zoom */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="w-[min(95vw,1200px)] max-w-6xl min-w-0 xl:min-w-[48rem] h-[90vh] p-0 bg-black/95 border-none mx-auto">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {!imageErrors[currentImageIndex] ? (
              <div
                className="relative w-full h-full flex items-center justify-center cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <img
                  src={images[currentImageIndex]}
                  alt={`Image ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${imageZoom}) translate(${
                      imagePosition.x / imageZoom
                    }px, ${imagePosition.y / imageZoom}px)`,
                    cursor:
                      imageZoom > 1
                        ? isDragging
                          ? "grabbing"
                          : "grab"
                        : "default",
                  }}
                  onError={() =>
                    setImageErrors((prev) => {
                      const copy = [...prev];
                      copy[currentImageIndex] = true;
                      return copy;
                    })
                  }
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/40 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-10 w-10" />
                  <span>Ảnh không khả dụng</span>
                </div>
              </div>
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white z-20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Horizontal control bar (prev / zoom-out / percent / zoom-in / next) */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/40 text-white hover:bg-black/60"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="bg-black/40 text-white hover:bg-black/60"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                disabled={imageZoom <= 1}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>

              <div className="px-3 py-1 rounded bg-black/50 text-white text-sm">
                {Math.round(imageZoom * 100)}%
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="bg-black/40 text-white hover:bg-black/60"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                disabled={imageZoom >= 4}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="bg-black/40 text-white hover:bg-black/60"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog confirm XÓA COMMENT dùng shadcn/ui Dialog */}
      <Dialog
        open={!!deleteCommentId}
        onOpenChange={(val) => !val && setDeleteCommentId(null)}
      >
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogTitle>Bạn có chắc muốn xóa bình luận?</DialogTitle>
          <div className="py-2 text-muted-foreground text-sm">
            {deleteTargetIsReply
              ? "Thao tác này sẽ xóa phản hồi vĩnh viễn."
              : "Thao tác này sẽ xóa bình luận chính và toàn bộ các phản hồi con."}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteCommentId(null)}
              disabled={isDeletingComment}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={isDeletingComment}
              onClick={async () => {
                if (!deleteCommentId) return;
                setIsDeletingComment(true);
                try {
                  await handleDeleteComment(deleteCommentId);
                  setDeleteCommentId(null);
                } finally {
                  setIsDeletingComment(false);
                }
              }}
            >
              {isDeletingComment ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full"></span>
                  Đang xóa...
                </span>
              ) : (
                "Xóa"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirmation Dialog */}
      <Dialog open={isDeletePostDialogOpen} onOpenChange={setIsDeletePostDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Xác nhận xóa bài viết
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-4">
              Bạn có chắc chắn muốn xóa bài viết này?
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ Hành động này không thể hoàn tác. Bài viết, tất cả bình luận và lượt thích sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="text-sm space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium">Nội dung:</span>{" "}
                <span className="line-clamp-2">{content}</span>
              </p>
              <p>
                <span className="font-medium">Thời gian:</span>{" "}
                {formatTimestamp(timestamp)}
              </p>
              {images.length > 0 && (
                <p>
                  <span className="font-medium">Hình ảnh:</span>{" "}
                  {images.length} ảnh
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeletePostDialogOpen(false)}
              disabled={isDeletingPost}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeletePost}
              disabled={isDeletingPost}
            >
              {isDeletingPost ? "Đang xóa..." : "Xóa bài viết"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      {clubId && (
        <EditPostDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          postId={postId}
          clubId={clubId}
          initialContent={content}
          initialImages={images.map((url, idx) => ({
            url,
            id: imageIds[idx],
          }))}
          onPostUpdated={() => {
            onPostUpdated?.();
            setIsEditDialogOpen(false);
          }}
        />
      )}
    </Card>
  );
};
