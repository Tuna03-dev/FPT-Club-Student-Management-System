package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.RecruitmentFormAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecruitmentFormAnswerRepository extends JpaRepository<RecruitmentFormAnswer, Long> {
    List<RecruitmentFormAnswer> findByApplication_Id(Long applicationId);
}


