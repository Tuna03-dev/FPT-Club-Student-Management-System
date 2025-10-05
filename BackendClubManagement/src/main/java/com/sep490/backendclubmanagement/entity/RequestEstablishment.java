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

    @Column(name = "club_name", nullable = false, length = 100)
    private String clubName;

    @Column(name = "club_category", nullable = false, length = 100)
    private String clubCategory;

    @Column(name = "club_code", unique = true, length = 50)
    private String clubCode;

    @Column(name = "status", length = 50)
    private String status; // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED

    @Column(name = "send_date")
    private LocalDateTime sendDate;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "requestEstablishment", cascade = CascadeType.ALL)
    private Set<ClubProposal> clubProposals;

    @OneToMany(mappedBy = "requestEstablishment", cascade = CascadeType.ALL)
    private Set<ClubCreationWorkFlowHistory> workflowHistories;

    @OneToOne(mappedBy = "requestEstablishment", cascade = CascadeType.ALL)
    private DefenseSchedule defenseSchedule;
}

