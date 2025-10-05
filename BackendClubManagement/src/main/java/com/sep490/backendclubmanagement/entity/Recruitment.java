package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "recruitments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recruitment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    @Column(name = "max_applicants")
    private Integer maxApplicants;

    @Column(name = "status", length = 50)
    private String status; // DRAFT, OPEN, CLOSED, CANCELLED

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @OneToMany(mappedBy = "recruitment", cascade = CascadeType.ALL)
    private Set<RecruitmentFormQuestion> formQuestions;

    @OneToMany(mappedBy = "recruitment", cascade = CascadeType.ALL)
    private Set<RecruitmentApplication> applications;
}

