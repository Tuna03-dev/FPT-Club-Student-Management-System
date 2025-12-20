package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "role_memberships",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"club_membership_id", "semester_id", "clubrole_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleMemberShip extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_membership_id", nullable = false)
    private ClubMemberShip clubMemberShip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clubrole_id", nullable = false)
    private ClubRole clubRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
