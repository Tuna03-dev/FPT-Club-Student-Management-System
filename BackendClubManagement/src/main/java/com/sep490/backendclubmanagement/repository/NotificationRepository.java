package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Notification;
import com.sep490.backendclubmanagement.entity.NotificationType;
import com.sep490.backendclubmanagement.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Find all notifications for a user (not deleted)
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt DESC
           """)
    Page<Notification> findByRecipientId(@Param("userId") Long userId, Pageable pageable);

    /**
     * Find unread notifications for a user
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.isRead = false
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt DESC
           """)
    Page<Notification> findUnreadByRecipientId(@Param("userId") Long userId, Pageable pageable);

    /**
     * Find read notifications for a user
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.isRead = true
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt DESC
           """)
    Page<Notification> findReadByRecipientId(@Param("userId") Long userId, Pageable pageable);

    /**
     * Count unread notifications for a user
     */
    @Query("""
           SELECT COUNT(n) FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.isRead = false
             AND n.deletedAt IS NULL
           """)
    Long countUnreadByRecipientId(@Param("userId") Long userId);

    /**
     * Find notifications by type for a user
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.notificationType = :type
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt DESC
           """)
    Page<Notification> findByRecipientIdAndType(
        @Param("userId") Long userId,
        @Param("type") NotificationType type,
        Pageable pageable
    );

    /**
     * Mark all notifications as read for a user
     */
    @Modifying
    @Query("""
           UPDATE Notification n
           SET n.isRead = true, n.readAt = :readAt
           WHERE n.recipient.id = :userId
             AND n.isRead = false
             AND n.deletedAt IS NULL
           """)
    void markAllAsReadByRecipientId(@Param("userId") Long userId, @Param("readAt") LocalDateTime readAt);

    /**
     * Mark specific notification as read
     */
    @Modifying
    @Query("""
           UPDATE Notification n
           SET n.isRead = true, n.readAt = :readAt
           WHERE n.id = :notificationId
             AND n.recipient.id = :userId
           """)
    void markAsRead(
        @Param("notificationId") Long notificationId,
        @Param("userId") Long userId,
        @Param("readAt") LocalDateTime readAt
    );

    /**
     * Soft delete notification
     */
    @Modifying
    @Query("""
           UPDATE Notification n
           SET n.deletedAt = :deletedAt
           WHERE n.id = :notificationId
             AND n.recipient.id = :userId
           """)
    void softDelete(
        @Param("notificationId") Long notificationId,
        @Param("userId") Long userId,
        @Param("deletedAt") LocalDateTime deletedAt
    );

    /**
     * Find unsent notifications (for batch processing)
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.isSent = false
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt ASC
           """)
    List<Notification> findUnsentNotifications(Pageable pageable);

    /**
     * Find notifications by related club
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.relatedClubId = :clubId
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt DESC
           """)
    Page<Notification> findByRecipientIdAndClubId(
        @Param("userId") Long userId,
        @Param("clubId") Long clubId,
        Pageable pageable
    );

    /**
     * Find notifications by related post
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.relatedPostId = :postId
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt DESC
           """)
    List<Notification> findByRecipientIdAndPostId(
        @Param("userId") Long userId,
        @Param("postId") Long postId
    );

    /**
     * Find notifications by related event
     */
    @Query("""
           SELECT n FROM Notification n
           WHERE n.recipient.id = :userId
             AND n.relatedEventId = :eventId
             AND n.deletedAt IS NULL
           ORDER BY n.createdAt DESC
           """)
    List<Notification> findByRecipientIdAndEventId(
        @Param("userId") Long userId,
        @Param("eventId") Long eventId
    );

    /**
     * Delete old read notifications (cleanup job)
     */
    @Modifying
    @Query("""
           UPDATE Notification n
           SET n.deletedAt = :now
           WHERE n.isRead = true
             AND n.readAt < :beforeDate
             AND n.deletedAt IS NULL
           """)
    void deleteOldReadNotifications(@Param("beforeDate") LocalDateTime beforeDate, @Param("now") LocalDateTime now);
}

