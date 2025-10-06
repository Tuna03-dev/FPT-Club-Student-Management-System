package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.Set;

@Entity
@Table(name = "submission_report_requirements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionReportRequirement extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "report_type", length = 100)
    @Enumerated(EnumType.STRING)
    private ReportType reportType; // MONTHLY, QUARTERLY, SEMESTER, ANNUAL, AD_HOC

    @Column(name = "template_url", length = 500)
    private String templateUrl;

    @OneToMany(mappedBy = "reportRequirement", cascade = CascadeType.ALL)
    private Set<Report> reports;

    @OneToOne
    @JoinColumn(name = "event_id", unique = true)
    private Event event;
}

