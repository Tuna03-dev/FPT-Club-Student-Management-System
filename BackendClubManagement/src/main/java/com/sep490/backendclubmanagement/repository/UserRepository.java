package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByIdAndSystemRole_RoleNameIgnoreCase(Long id, String roleName);

    @Query("""
        SELECT CASE WHEN COUNT(u) > 0 THEN TRUE ELSE FALSE END
        FROM User u
        WHERE u.id = :id
          AND UPPER(u.systemRole.roleName) IN ('STAFF','ADMIN')
    """)
    boolean isStaffOrAdmin(@Param("id") Long id);
}


