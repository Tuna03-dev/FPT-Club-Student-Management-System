package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.PayOSPayment;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayOSPaymentRepository extends JpaRepository<PayOSPayment, Long> {
    
    @Query("""
        SELECT p FROM PayOSPayment p
        JOIN p.incomeTransaction it
        JOIN it.clubWallet cw
        WHERE cw.club.id = :clubId
        ORDER BY COALESCE(p.paymentTime, p.transactionDateTime, p.createdAt) DESC
    """)
    List<PayOSPayment> findTop10ByClubIdOrderByPaymentTimeDesc(@Param("clubId") Long clubId, Pageable pageable);
    
    default List<PayOSPayment> findTop10RecentPaymentsByClubId(Long clubId) {
        return findTop10ByClubIdOrderByPaymentTimeDesc(clubId, PageRequest.of(0, 10));
    }
}

