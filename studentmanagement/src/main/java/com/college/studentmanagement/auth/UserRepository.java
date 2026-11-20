
package com.college.studentmanagement.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByStudentId(Long studentId);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRollNumberIgnoreCase(String rollNumber);

    List<User> findByRoleAndStatus(String role, String status);
}
