package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.dto.response.EventWithoutReportRequirementDto;
import com.sep490.backendclubmanagement.dto.response.UpcomingEventDTO;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.Event;
import com.sep490.backendclubmanagement.entity.EventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.UpcomingEventDTO(e.id, e.title, e.startTime, e.location, c.clubName, m.mediaUrl) " +
            "FROM Event e JOIN e.club c LEFT JOIN e.eventMedia m " +
            "WHERE e.startTime > :now AND (m IS NULL OR m.displayOrder = 1) " +
            "ORDER BY e.startTime ASC")
    List<UpcomingEventDTO> findUpcomingEvents(LocalDateTime now, Pageable pageable);


    // ✅ Thêm phần lọc/tìm kiếm sự kiện (được gọi trong EventService)
    @Query(value = """
                                     SELECT DISTINCT e.*
                                         FROM events e
                                         LEFT JOIN clubs c ON e.club_id = c.id
                                         LEFT JOIN event_types et ON e.event_type_id = et.id
                                         LEFT JOIN event_media em ON em.event_id = e.id
                                         WHERE\s
                                             
                                              (:#{#request.eventTypeId} IS NULL OR e.event_type_id = :#{#request.eventTypeId})
                                             AND (:#{#request.clubId} IS NULL OR e.club_id = :#{#request.clubId})
                                             AND (
                                                 :#{#request.startTime} IS NULL\s
                                                 OR :#{#request.endTime} IS NULL\s
                                                 OR (e.end_time >= :#{#request.startTime} AND e.start_time <= :#{#request.endTime})
                                             )
                                            AND e.is_draft = false
          """, nativeQuery = true,countProjection = "e.id")
    public Page<Event> getAllByFilter(EventRequest request, Pageable pageable);

    @Query("SELECT et FROM EventType et")
    List<EventType> findAllEventTypes();

    @Query("SELECT c FROM Club c")
    List<Club> findAllClubs();

    @Query("SELECT e FROM Event e WHERE (e.club.id = :clubId OR e.club.id IS NULL ) AND e.isDraft = false")
    List<Event> findByClubIdAndIsDraftFalse(Long clubId);

    /**
     * Lấy danh sách events chưa được yêu cầu nộp báo cáo
     * Event chưa có yêu cầu báo cáo khi:
     * - Event có club (không null)
     * - Event không phải draft
     * - Không tồn tại SubmissionReportRequirement với ClubReportRequirement cho club tổ chức sự kiện
     */
    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.EventWithoutReportRequirementDto(" +
            "e.id, e.title, c.id, c.clubName) " +
            "FROM Event e " +
            "JOIN e.club c " +
            "WHERE e.club IS NOT NULL " +
            "AND e.isDraft = false " +
            "AND NOT EXISTS (" +
            "    SELECT 1 FROM SubmissionReportRequirement srr " +
            "    JOIN ClubReportRequirement crr ON crr.submissionReportRequirement.id = srr.id " +
            "    WHERE srr.event.id = e.id AND crr.club.id = c.id" +
            ") " +
            "ORDER BY e.id DESC")
    List<EventWithoutReportRequirementDto> findEventsWithoutReportRequirement();
}
