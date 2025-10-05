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

    @Column(name = "requirement_name", nullable = false, length = 300)
    private String requirementName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "report_type", length = 100)
    private String reportType; // MONTHLY, QUARTERLY, SEMESTER, ANNUAL, AD_HOC

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory = true;

    @Column(name = "template_url", length = 500)
    private String templateUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_department_id")
    private AdminDepartment adminDepartment;

    @OneToMany(mappedBy = "reportRequirement", cascade = CascadeType.ALL)
    private Set<Report> reports;
}

