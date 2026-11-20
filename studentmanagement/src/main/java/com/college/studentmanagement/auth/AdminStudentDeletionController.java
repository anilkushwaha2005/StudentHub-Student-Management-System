package com.college.studentmanagement.auth;

import com.college.studentmanagement.Student;
import com.college.studentmanagement.StudentRepository;
import com.college.studentmanagement.forms.FormSubmissionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/students")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStudentDeletionController {
    private final StudentRepository students;
    private final UserRepository users;
    private final FormSubmissionRepository submissions;
    public AdminStudentDeletionController(StudentRepository students, UserRepository users, FormSubmissionRepository submissions) {
        this.students = students; this.users = users; this.submissions = submissions;
    }
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<Student> found = students.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        Student student = found.get();
        String email = student.getEmail();
        if (email != null && !email.isBlank()) {
            submissions.deleteByStudentEmailIgnoreCase(email);
            users.findByEmailIgnoreCase(email).ifPresent(users::delete);
        }
        students.delete(student);
        return ResponseEntity.noContent().build();
    }
}
