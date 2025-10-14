package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface EventRepository extends JpaRepository<Event,Long> {

    @Query(value = """
                                     SELECT DISTINCT e.*
                                         FROM events e
                                         LEFT JOIN clubs c ON e.club_id = c.id
                                         LEFT JOIN event_types et ON e.event_type_id = et.id
                                         LEFT JOIN event_media em ON em.event_id = e.id
                                         WHERE\s
                                             (:#{#request.keyword} IS NULL\s
                                                 OR e.title LIKE CONCAT('%', :#{#request.keyword}, '%')
                                                 OR e.description LIKE CONCAT('%', :#{#request.keyword}, '%')
                                                 OR e.location LIKE CONCAT('%', :#{#request.keyword}, '%'))
                                             AND (:#{#request.clubId} IS NULL OR e.club_id = :#{#request.clubId})
                                             AND (:#{#request.eventTypeId} IS NULL OR e.event_type_id = :#{#request.eventTypeId})
                                             AND (
                                                 :#{#request.startTime} IS NULL\s
                                                 OR :#{#request.endTime} IS NULL\s
                                                 OR (e.end_time >= :#{#request.startTime} AND e.start_time <= :#{#request.endTime})
                                             )
                                            AND e.is_draft = false
          """, nativeQuery = true,countProjection = "e.id")
    public Page<Event> getAllByFilter(EventRequest request, Pageable pageable);
}
