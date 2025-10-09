package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "request_news")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestNews extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_title", nullable = false, length = 500)
    private String requestTitle;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "response_message", nullable = false, columnDefinition = "TEXT")
    private String responseMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private RequestStatus status;

    @Column(name = "request_date")
    private LocalDateTime requestDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "news_id", unique = true)
    private News news;


}

