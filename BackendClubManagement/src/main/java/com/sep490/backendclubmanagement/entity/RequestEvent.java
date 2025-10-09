package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "request_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_title", unique = true, length = 100)
    private String requestTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private RequestStatus status;

    @Column(name = "request_date")
    private LocalDateTime requestDate;


    @Column(name = "responseMessage", columnDefinition = "TEXT")
    private String responseMessage;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @OneToOne(mappedBy = "requestEvent", cascade = CascadeType.ALL)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;


}

