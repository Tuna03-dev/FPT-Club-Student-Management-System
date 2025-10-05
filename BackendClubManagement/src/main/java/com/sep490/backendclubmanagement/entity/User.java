package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", unique = true, nullable = false, length = 100)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "email", unique = true, nullable = false, length = 100)
    private String email;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "student_code", unique = true, length = 50)
    private String studentCode;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "system_role_id")
    private SystemRole systemRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campus_id")
    private Campus campus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_department_id")
    private AdminDepartment adminDepartment;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<ClubMemberShip> clubMemberships;

    @OneToMany(mappedBy = "createdBy", cascade = CascadeType.ALL)
    private Set<Post> posts;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<Comment> comments;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<Like> likes;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<EventAttendance> eventAttendances;

    @OneToMany(mappedBy = "createdBy", cascade = CascadeType.ALL)
    private Set<RequestEstablishment> requestEstablishments;

    @OneToMany(mappedBy = "applicant", cascade = CascadeType.ALL)
    private Set<RecruitmentApplication> recruitmentApplications;

    @OneToMany(mappedBy = "submittedBy", cascade = CascadeType.ALL)
    private Set<Report> reports;
}

