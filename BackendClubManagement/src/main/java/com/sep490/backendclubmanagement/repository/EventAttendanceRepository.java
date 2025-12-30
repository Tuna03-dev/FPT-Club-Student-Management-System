package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.AttendanceStatus;
import com.sep490.backendclubmanagement.entity.EventAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventAttendanceRepository extends JpaRepository<EventAttendance, Long> {
    
    Optional<EventAttendance> findByEventIdAndUserId(Long eventId, Long userId);
    
    boolean existsByEventIdAndUserId(Long eventId, Long userId);
    
    List<EventAttendance> findByEventId(Long eventId);
    
    List<EventAttendance> findByUserId(Long userId);
    
    @Query("SELECT ea FROM EventAttendance ea WHERE ea.event.id = :eventId AND ea.attendanceStatus = :status")
    List<EventAttendance> findByEventIdAndStatus(@Param("eventId") Long eventId, @Param("status") AttendanceStatus status);
    
    @Query("SELECT COUNT(ea) FROM EventAttendance ea WHERE ea.event.id = :eventId ")
    Long countByEventIdAndStatus(@Param("eventId") Long eventId);
    
    /**
     * Lấy thời gian check-in gần nhất của user trong các event của club
     * @param userId ID của user
     * @param clubId ID của club
     * @return Thời gian check-in gần nhất, hoặc null nếu chưa có
     */
    @Query("""
        SELECT MAX(ea.checkInTime)
        FROM EventAttendance ea
        WHERE ea.user.id = :userId
        AND ea.event.club.id = :clubId
        AND ea.checkInTime IS NOT NULL
        """)
    java.time.LocalDateTime findLastCheckInTimeByUserAndClub(@Param("userId") Long userId, @Param("clubId") Long clubId);
}
















