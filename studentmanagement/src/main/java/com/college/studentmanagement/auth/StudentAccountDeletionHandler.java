package com.college.studentmanagement.auth;

import com.college.studentmanagement.Student;
import org.springframework.data.rest.core.annotation.HandleBeforeDelete;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * When an administrator permanently deletes a Student Directory record through
 * Spring Data REST, remove the linked student login account as well.
 * Historical form submissions are deliberately retained.
 */
@Component
@RepositoryEventHandler(Student.class)
public class StudentAccountDeletionHandler {
    private final UserRepository userRepository;

    public StudentAccountDeletionHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @HandleBeforeDelete
    @Transactional
    public void deleteLinkedStudentAccount(Student student) {
        if (student == null) {
            return;
        }

        // Prefer the stable student ID; fall back to email for older accounts
        // created before studentId was populated.
        if (student.getId() != null) {
            userRepository.findByStudentId(student.getId())
                    .ifPresent(userRepository::delete);
        }
        if (student.getEmail() != null && !student.getEmail().isBlank()) {
            userRepository.findByEmailIgnoreCase(student.getEmail().trim())
                    .ifPresent(userRepository::delete);
        }
    }
}
