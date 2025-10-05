package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "request_establishments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestEstablishment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", unique = true, length = 100)
    private String requestCode;

    @Column(name = "status", length = 50)
    private String status; // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED

    @Column(name = "submitted_date")
    private LocalDateTime submittedDate;

    @Column(name = "reviewed_date")
    private LocalDateTime reviewedDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToOne(mappedBy = "requestEstablishment", cascade = CascadeType.ALL)
    private ClubProposal clubProposal;

    @OneToMany(mappedBy = "requestEstablishment", cascade = CascadeType.ALL)
    private Set<ClubCreationWorkFlowHistory> workflowHistories;

    @OneToOne(mappedBy = "requestEstablishment", cascade = CascadeType.ALL)
    private DefenseSchedule defenseSchedule;
}

