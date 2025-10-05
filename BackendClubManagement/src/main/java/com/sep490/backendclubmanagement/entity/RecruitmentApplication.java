package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "recruitment_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecruitmentApplication extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "submitted_date")
    private LocalDateTime submittedDate;

    @Column(name = "team_id")
    private Long teamId;

    @Column(name = "status", length = 50)
    private String status; // SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, WITHDRAWN

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "reviewed_date")
    private LocalDateTime reviewedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruitment_id", nullable = false)
    private Recruitment recruitment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_id", nullable = false)
    private User applicant;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL)
    private Set<RecruitmentFormAnswer> answers;
}

