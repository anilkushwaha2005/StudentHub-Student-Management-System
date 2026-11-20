package com.college.studentmanagement.profile;

import com.college.studentmanagement.auth.User;
import com.college.studentmanagement.auth.UserRepository;
import com.college.studentmanagement.Student;
import com.college.studentmanagement.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
public class StudentProfileController {
    private final UserRepository users;
    private final StudentRepository students;
    public StudentProfileController(UserRepository users, StudentRepository students) { this.users = users; this.students = students; }

    @GetMapping("/profile")
    public ResponseEntity<?> profile(Authentication auth) {
        User u = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        return ResponseEntity.ok(Map.of(
            "email", u.getEmail(),
            "fullName", safe(u.getFullName()),
            "rollNumber", safe(u.getRollNumber()),
            "course", safe(u.getCourse()),
            "phone", safe(u.getPhone()),
            "address", safe(u.getAddress())
        ));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> update(@RequestBody ProfileRequest r, Authentication auth) {
        User u = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if (r.fullName() == null || r.fullName().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Full name is required"));
        u.setFullName(r.fullName().trim());
        u.setRollNumber(clean(r.rollNumber()));
        u.setCourse(clean(r.course()));
        u.setPhone(clean(r.phone()));
        u.setAddress(clean(r.address()));
        users.save(u);
        Student record = students.findAll().stream()
            .filter(s -> s.getEmail() != null && s.getEmail().equalsIgnoreCase(u.getEmail()))
            .findFirst().orElseGet(Student::new);
        record.setEmail(u.getEmail());
        record.setName(u.getFullName());
        record.setRollNumber(u.getRollNumber() == null || u.getRollNumber().isBlank()
            ? "PENDING-" + u.getEmail().toLowerCase().replaceAll("[^a-z0-9]", "")
            : u.getRollNumber());
        record.setCourse(u.getCourse() == null || u.getCourse().isBlank() ? "Not provided" : u.getCourse());
        students.save(record);
        return ResponseEntity.ok(Map.of("message", "Profile saved"));
    }

    private String safe(String v) { return v == null ? "" : v; }
    private String clean(String v) { return v == null ? null : v.trim(); }
    public record ProfileRequest(String fullName, String rollNumber, String course, String phone, String address) {}
}
