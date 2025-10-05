package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

@Entity
@Table(name = "fees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fee extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fee_name", nullable = false, length = 200)
    private String feeName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "fee_type", length = 50)
    private String feeType; // MEMBERSHIP, EVENT, OTHER

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @OneToMany(mappedBy = "fee", cascade = CascadeType.ALL)
    private Set<IncomeTransaction> incomeTransactions;
}

