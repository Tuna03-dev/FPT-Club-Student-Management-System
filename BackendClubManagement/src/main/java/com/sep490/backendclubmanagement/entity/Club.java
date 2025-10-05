package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "clubs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Club extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "club_name", nullable = false, length = 200)
    private String clubName;

    @Column(name = "club_code", unique = true, length = 50)
    private String clubCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "facebook_url", length = 500)
    private String facebookUrl;

    @Column(name = "website_url", length = 500)
    private String websiteUrl;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "status", length = 50)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campus_id")
    private Campus campus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_category_id")
    private ClubCategory clubCategory;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<ClubMemberShip> clubMemberships;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<Post> posts;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<Team> teams;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<Event> events;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<ClubRole> clubRoles;

    @OneToOne(mappedBy = "club", cascade = CascadeType.ALL)
    private ClubWallet clubWallet;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<Recruitment> recruitments;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<RequestNews> requestNews;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<Report> reports;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<ClubProposal> clubProposals;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    private Set<Fee> fees;
}

