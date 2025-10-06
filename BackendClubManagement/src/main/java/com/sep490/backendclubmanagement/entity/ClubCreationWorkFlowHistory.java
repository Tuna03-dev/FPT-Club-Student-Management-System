package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "club_creation_workflow_histories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubCreationWorkFlowHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "step_name", nullable = false, length = 100)
    private String stepName;

    @Column(name = "action_date")
    private LocalDateTime actionDate;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "step_number")
    private Integer stepNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_establishment_id", nullable = false)
    private RequestEstablishment requestEstablishment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acted_by", nullable = false)
    private User actedBy;
}

