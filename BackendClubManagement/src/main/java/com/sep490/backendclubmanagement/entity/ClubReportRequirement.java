package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "club_report_requirements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubReportRequirement extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private ClubReportRequirementStatus status;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_report_requirement_id", nullable = false)
    private SubmissionReportRequirement submissionReportRequirement;
}
