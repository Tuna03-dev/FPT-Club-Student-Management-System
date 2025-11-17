package com.sep490.backendclubmanagement.dto.response;

import lombok.*;

import java.math.BigDecimal;

/**
 * Response DTO for finance summary dashboard
 * Contains aggregated financial information for a club
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinanceSummaryResponse {

    /**
     * Current wallet balance (remaining money)
     */
    private BigDecimal balance;

    /**
     * Total income from all SUCCESS income transactions
     */
    private BigDecimal totalIncome;

    /**
     * Total expense from all SUCCESS outcome transactions
     */
    private BigDecimal totalExpense;

    /**
     * Total budget (initial balance + total income)
     * This represents all money the club has received
     */
    private BigDecimal totalBudget;

    /**
     * Remaining amount (balance)
     * Same as balance but included for clarity
     */
    private BigDecimal remaining;

    /**
     * Currency code (usually VND)
     */
    private String currency;

    /**
     * Wallet ID for reference
     */
    private Long walletId;
}

