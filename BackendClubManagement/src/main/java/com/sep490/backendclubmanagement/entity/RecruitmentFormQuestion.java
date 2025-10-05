package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "recruitment_form_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecruitmentFormQuestion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "question_type", length = 50)
    private String questionType; // TEXT, MULTIPLE_CHOICE, CHECKBOX, RADIO, FILE_UPLOAD

    @Column(name = "is_required", nullable = false)
    private Boolean isRequired = false;

    @Column(name = "question_order")
    private Integer questionOrder;

    @Column(name = "max_length")
    private Integer maxLength;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruitment_id", nullable = false)
    private Recruitment recruitment;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    private Set<QuestionOption> options;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    private Set<RecruitmentFormAnswer> answers;
}

