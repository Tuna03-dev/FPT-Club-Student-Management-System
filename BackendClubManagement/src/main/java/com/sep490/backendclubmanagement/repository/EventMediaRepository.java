package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.EventMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
@Repository
public interface EventMediaRepository extends JpaRepository<EventMedia, Long> {

    @Query(value = """
             SELECT em.mediaUrl FROM EventMedia em WHERE em.event.id = :eventId""",
           nativeQuery = false)
    List<String> findMediaUrlsByEventId(@Param("eventId") Long eventId);
}
