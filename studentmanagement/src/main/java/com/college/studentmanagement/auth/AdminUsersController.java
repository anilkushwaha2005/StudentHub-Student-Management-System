package com.college.studentmanagement.auth;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsersController {
    private final UserRepository users;
    public AdminUsersController(UserRepository users) { this.users = users; }

    @GetMapping
    public List<UserSummary> listStudentAccounts() {
        return users.findAll().stream()
            .filter(u -> "STUDENT".equalsIgnoreCase(u.getRole()))
            .map(u -> new UserSummary(u.getEmail(), safe(u.getFullName()), safe(u.getRollNumber()),
                    safe(u.getCourse()), safe(u.getPhone()), safe(u.getAddress()), safe(u.getStatus())))
            .toList();
    }
    private static String safe(String value) { return value == null ? "" : value; }
    public record UserSummary(String email, String name, String rollNumber, String course,
                              String phone, String address, String status) {}
}
