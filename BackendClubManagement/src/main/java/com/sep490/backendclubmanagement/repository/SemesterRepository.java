package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {

    @Query("SELECT s FROM Semester s WHERE NOW() BETWEEN s.startDate AND s.endDate")
    Optional<Semester> findCurrentSemester();
}
