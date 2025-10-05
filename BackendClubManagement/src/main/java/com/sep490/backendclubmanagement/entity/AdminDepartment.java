package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "admin_departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDepartment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "department_name", nullable = false, length = 200)
    private String departmentName;

    @Column(name = "department_code", unique = true, length = 50)
    private String departmentCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campus_id")
    private Campus campus;

    @OneToMany(mappedBy = "adminDepartment", cascade = CascadeType.ALL)
    private Set<User> users;

    @OneToMany(mappedBy = "adminDepartment", cascade = CascadeType.ALL)
    private Set<SubmissionReportRequirement> reportRequirements;
}

