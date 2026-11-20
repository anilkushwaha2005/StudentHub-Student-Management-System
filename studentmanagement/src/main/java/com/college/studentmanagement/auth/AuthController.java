
package com.college.studentmanagement.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            String message = authService.registerStudent(
                    request.fullName(),
                    request.rollNumber(),
                    request.course(),
                    request.email(),
                    request.password()
            );

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", message));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            AuthService.LoginResult result = authService.login(
                    request.email(),
                    request.password()
            );

            return ResponseEntity.ok(Map.of(
                    "token", result.token(),
                    "email", result.email(),
                    "role", result.role()
            ));

        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", ex.getMessage()));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    public record RegisterRequest(String fullName, String rollNumber, String course, String email, String password) {}

    public record LoginRequest(String email, String password) {}
}
