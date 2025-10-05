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

    @Column(name = "status", length = 50)
    private String status; // PENDING, IN_PROGRESS, COMPLETED, REJECTED

    @Column(name = "action_date")
    private LocalDateTime actionDate;

    @Column(name = "actor", length = 200)
    private String actor;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "step_order")
    private Integer stepOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_establishment_id", nullable = false)
    private RequestEstablishment requestEstablishment;
}

