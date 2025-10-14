// In: repository/EventRepository.java
package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.UpcomingEventDTO;
import com.sep490.backendclubmanagement.entity.Event; // Nhớ import Entity của bạn
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository; // <-- THÊM DÒNG NÀY
import java.time.LocalDateTime;
import java.util.List;

@Repository // <-- VÀ THÊM ANNOTATION NÀY
public interface EventRepository extends JpaRepository<Event, Long> {

    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.UpcomingEventDTO(e.id, e.title, e.startTime, e.location, c.clubName, m.mediaUrl) " +
            "FROM Event e JOIN e.club c LEFT JOIN e.eventMedia m " +
            "WHERE e.startTime > :now AND (m IS NULL OR m.displayOrder = 1) " +
            "ORDER BY e.startTime ASC")
    List<UpcomingEventDTO> findUpcomingEvents(LocalDateTime now, Pageable pageable);
}