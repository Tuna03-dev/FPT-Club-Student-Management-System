package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "club_proposals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubProposal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "proposed_club_name", nullable = false, length = 200)
    private String proposedClubName;

    @Column(name = "proposed_club_code", length = 50)
    private String proposedClubCode;

    @Column(name = "vision", columnDefinition = "TEXT")
    private String vision;

    @Column(name = "mission", columnDefinition = "TEXT")
    private String mission;

    @Column(name = "objectives", columnDefinition = "TEXT")
    private String objectives;

    @Column(name = "activities", columnDefinition = "TEXT")
    private String activities;

    @Column(name = "target_members", columnDefinition = "TEXT")
    private String targetMembers;

    @Column(name = "expected_budget", columnDefinition = "TEXT")
    private String expectedBudget;

    @Column(name = "proposal_document_url", length = 500)
    private String proposalDocumentUrl;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_establishment_id", nullable = false, unique = true)
    private RequestEstablishment requestEstablishment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id")
    private Club club;
}

