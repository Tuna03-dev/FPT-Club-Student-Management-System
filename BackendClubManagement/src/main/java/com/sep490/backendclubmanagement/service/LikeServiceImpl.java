package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.LikeDTO;
import com.sep490.backendclubmanagement.dto.websocket.LikeWebSocketPayload;
import com.sep490.backendclubmanagement.dto.websocket.WebSocketMessageAction;
import com.sep490.backendclubmanagement.dto.websocket.WebSocketMessageType;
import com.sep490.backendclubmanagement.entity.Like;
import com.sep490.backendclubmanagement.entity.NotificationPriority;
import com.sep490.backendclubmanagement.entity.NotificationType;
import com.sep490.backendclubmanagement.entity.Post;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.mapper.LikeMapper;
import com.sep490.backendclubmanagement.repository.LikeRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
@Slf4j
public class LikeServiceImpl implements LikeService {

    private final LikeRepository likeRepo;
    private final EntityManager em;
    private final LikeMapper likeMapper;
    private final WebSocketService webSocketService;
    private final UserRepository userRepository;
    private final com.sep490.backendclubmanagement.repository.PostRepository postRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public boolean toggleLike(Long postId, Long userId) {
        boolean liked;

        // Nếu đã like -> bỏ like
        if (likeRepo.existsByPost_IdAndUser_Id(postId, userId)) {
            likeRepo.deleteByPost_IdAndUser_Id(postId, userId);
            liked = false;
        } else {
            // Nếu chưa like -> tạo like (dùng reference để không tốn query không cần)
            var postRef = em.getReference(Post.class, postId);
            var userRef = em.getReference(com.sep490.backendclubmanagement.entity.User.class, userId);
            try {
                likeRepo.save(Like.builder().post(postRef).user(userRef).build());
                liked = true;
            } catch (DataIntegrityViolationException e) {
                // Đề phòng click nhanh song song gây vi phạm unique (user_id, post_id)
                // => coi như đã like
                liked = true;
            }
        }

        // 🔔 Gửi WebSocket notification realtime
        try {
            // Lấy thông tin post để biết clubId
            Post post = postRepository.findById(postId).orElse(null);
            if (post == null || post.getClub() == null) {
                log.warn("Cannot send like WebSocket: post or club not found for postId={}", postId);
                return liked;
            }

            User user = userRepository.findById(userId).orElse(null);
            long totalLikes = likeRepo.countByPost_Id(postId);
            Long clubId = post.getClub().getId();

            LikeWebSocketPayload payload = LikeWebSocketPayload.builder()
                    .postId(postId)
                    .userId(userId)
                    .userFullName(user != null ? user.getFullName() : "Unknown")
                    .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                    .liked(liked)
                    .totalLikes(totalLikes)
                    .build();

            // Broadcast to club members only (người trong club đang xem bài viết)
            webSocketService.broadcastToClub(
                    clubId,
                    WebSocketMessageType.POST.name(),
                    WebSocketMessageAction.UPDATED.name(),
                    payload
            );

            log.info("Sent like WebSocket to club {}: postId={}, userId={}, liked={}, total={}",
                    clubId, postId, userId, liked, totalLikes);
        } catch (Exception e) {
            log.error("Failed to send like WebSocket notification", e);
            // Don't throw - WebSocket failure shouldn't break the like operation
        }

        // 🔔 Gửi notification khi like (chỉ khi liked = true, không gửi khi unlike)
        if (liked) {
            try {
                Post post = postRepository.findById(postId).orElse(null);
                if (post == null) {
                    log.warn("Cannot send like notification: post not found for postId={}", postId);
                    return liked;
                }

                User postAuthor = post.getCreatedBy();
                if (postAuthor != null && !postAuthor.getId().equals(userId)) {
                    // Không gửi notification cho chính mình
                    User liker = userRepository.findById(userId).orElse(null);
                    if (liker != null) {
                        String title = liker.getFullName() + " đã thích bài viết của bạn";
                        String message = post.getTitle() != null && !post.getTitle().isEmpty()
                                ? "\"" + post.getTitle() + "\""
                                : "Bài viết của bạn";
                        String actionUrl = "/posts/" + postId;

                        notificationService.sendToUser(
                                postAuthor.getId(),
                                userId,
                                title,
                                message,
                                NotificationType.POST_LIKED,
                                NotificationPriority.LOW, // Priority thấp vì like không quan trọng bằng comment
                                actionUrl,
                                post.getClub() != null ? post.getClub().getId() : null,
                                null, // relatedNewsId
                                null, // relatedTeamId
                                null, // relatedRequestId
                                null  // relatedEventId
                        );

                        log.info("Sent like notification to user {}: postId={}, liker={}",
                                postAuthor.getId(), postId, userId);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to send like notification", e);
                // Don't throw - notification failure shouldn't break the like operation
            }
        }

        return liked;
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public long count(Long postId) {
        return likeRepo.countByPost_Id(postId);
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public boolean isLikedByUser(Long postId, Long userId) {
        return likeRepo.existsByPost_IdAndUser_Id(postId, userId);
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public Page<LikeDTO> listLikes(Long postId, Pageable pageable) {
        return likeRepo.findByPost_Id(postId, pageable)
                .map(likeMapper::toDTO);
    }
}
