package com.sep490.backendclubmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.Set;

@Entity
@Table(name = "club_wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubWallet extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false, unique = true)
    private Club club;

    @Column(name = "balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "total_income", precision = 15, scale = 2)
    private BigDecimal totalIncome = BigDecimal.ZERO;

    @Column(name = "total_outcome", precision = 15, scale = 2)
    private BigDecimal totalOutcome = BigDecimal.ZERO;

    @Column(name = "currency", length = 10)
    private String currency = "VND";

    @Column(name = "payOs_client_id", length = 100)
    private String payOsClientId;

    @Column(name = "payOs_api_key", length = 100)
    private String payOsApiKey;

    @Column(name = "payOs_checksum_key", length = 100)
    private String payOsChecksumKey;

    @Column(name = "payOs_status", length = 100)
    private String payOsStatus;


    @OneToMany(mappedBy = "clubWallet", cascade = CascadeType.ALL)
    private Set<IncomeTransaction> incomeTransactions;

    @OneToMany(mappedBy = "clubWallet", cascade = CascadeType.ALL)
    private Set<OutcomeTransaction> outcomeTransactions;
}

