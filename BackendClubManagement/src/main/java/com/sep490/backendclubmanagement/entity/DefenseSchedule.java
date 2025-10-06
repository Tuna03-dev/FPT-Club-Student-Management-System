package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "defense_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DefenseSchedule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "defense_date", nullable = false)
    private LocalDateTime defenseDate;

    @Column(name = "location", length = 500)
    private String location;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(name = "panel_members", columnDefinition = "TEXT")
    private String panelMembers;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "result", length = 50)
    @Enumerated(EnumType.STRING)
    private DefenseScheduleStatus result; // PASSED, FAILED, PENDING

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_establishment_id", nullable = false, unique = true)
    private RequestEstablishment requestEstablishment;
}

