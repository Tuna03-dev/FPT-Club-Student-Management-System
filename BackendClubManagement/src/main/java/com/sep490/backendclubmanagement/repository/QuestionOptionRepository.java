package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {
    List<QuestionOption> findByQuestion_IdOrderByOptionOrderAsc(Long questionId);
}