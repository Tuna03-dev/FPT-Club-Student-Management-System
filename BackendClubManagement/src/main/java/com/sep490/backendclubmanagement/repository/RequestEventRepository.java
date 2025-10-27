package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.RequestEvent;
import com.sep490.backendclubmanagement.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RequestEventRepository extends JpaRepository<RequestEvent, Long> {
    
    @Query(value = "SELECT * FROM request_events WHERE event_id = :eventId", nativeQuery = true)
    Optional<RequestEvent> findByEventId(@Param("eventId") Long eventId);
    
    @Query(value = "SELECT * FROM request_events WHERE status = :status ORDER BY request_date DESC", nativeQuery = true)
    List<RequestEvent> findByStatus(@Param("status") RequestStatus status);
    
    @Query(value = "SELECT re.* FROM request_events re " +
           "INNER JOIN events e ON re.event_id = e.id " +
           "WHERE re.status = :status AND e.club_id = :clubId " +
           "ORDER BY re.request_date DESC", nativeQuery = true)
    List<RequestEvent> findByStatusAndClubId(
            @Param("status") RequestStatus status,
            @Param("clubId") Long clubId
    );
    
    @Query(value = "SELECT * FROM request_events WHERE status IN (:statuses) ORDER BY request_date DESC", nativeQuery = true)
    List<RequestEvent> findByStatuses(@Param("statuses") List<RequestStatus> statuses);
    
    @Query("SELECT re FROM RequestEvent re " +
           "LEFT JOIN FETCH re.event e " +
           "LEFT JOIN FETCH e.club " +
           "WHERE re.id = :id")
    Optional<RequestEvent> findByIdWithEventAndClub(@Param("id") Long id);
}

