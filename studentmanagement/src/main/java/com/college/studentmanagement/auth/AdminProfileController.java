package com.college.studentmanagement.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/profile")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProfileController {
    private final UserRepository users;
    public AdminProfileController(UserRepository users) { this.users = users; }

    @GetMapping
    public ResponseEntity<?> get(Authentication auth) {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("email", user.getEmail(), "fullName", user.getFullName() == null ? "" : user.getFullName()));
    }

    @PutMapping
    public ResponseEntity<?> update(@RequestBody ProfileUpdate request, Authentication auth) {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        if (request.fullName() == null || request.fullName().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Full name is required"));
        user.setFullName(request.fullName().trim());
        users.save(user);
        return ResponseEntity.ok(Map.of("email", user.getEmail(), "fullName", user.getFullName(), "message", "Profile saved"));
    }
    public record ProfileUpdate(String fullName) {}
}
