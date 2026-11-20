
package com.college.studentmanagement.auth;

import com.college.studentmanagement.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.college.studentmanagement.Student;
import com.college.studentmanagement.StudentRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StudentRepository studentRepository;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            StudentRepository studentRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.studentRepository = studentRepository;
    }

    @Transactional
    public String registerStudent(String fullName, String rollNumber, String course, String email, String password) {
        if (fullName == null || fullName.isBlank()
                || rollNumber == null || rollNumber.isBlank()
                || course == null || course.isBlank()
                || email == null || email.isBlank()) {
            throw new IllegalArgumentException("Full name, roll number, course, and email are required");
        }
        if (!email.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Enter a valid email address");
        }
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must contain at least 8 characters");
        }

        String normalizedEmail = email.trim().toLowerCase();
        String normalizedRoll = rollNumber.trim();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        if (studentRepository.existsByRollNumberIgnoreCase(normalizedRoll)
                || userRepository.existsByRollNumberIgnoreCase(normalizedRoll)) {
            throw new IllegalArgumentException("A student with this roll number already exists");
        }
        if (studentRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("A student with this email already exists");
        }

        // Save the directory record first so the account can keep its stable student ID.
        Student record = new Student(fullName.trim(), normalizedRoll, course.trim(), normalizedEmail);
        record = studentRepository.saveAndFlush(record);

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole("STUDENT");
        user.setStatus("ACTIVE");
        user.setFullName(fullName.trim());
        user.setRollNumber(normalizedRoll);
        user.setCourse(course.trim());
        user.setStudentId(record.getId());
        userRepository.save(user);
        return "Account created successfully. You can now sign in with your email and password.";
    }

    @Transactional(readOnly = true)
    public LoginResult login(String email, String password) {
        if (email == null || email.isBlank()
                || password == null || password.isBlank()) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = userRepository
            .findByEmailIgnoreCase(email.trim())
            .orElseThrow(() ->
                new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new BadCredentialsException(
                "Your account is not active. Contact the administrator."
            );
        }

        String token = jwtService.generateToken(
            user.getEmail(),
            user.getRole()
        );

        return new LoginResult(
            token,
            user.getEmail(),
            user.getRole()
        );
    }

    public record LoginResult(
        String token,
        String email,
        String role
    ) {}
}
