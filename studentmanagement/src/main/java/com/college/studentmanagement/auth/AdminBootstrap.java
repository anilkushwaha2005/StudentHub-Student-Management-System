
package com.college.studentmanagement.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Configuration
public class AdminBootstrap {

    @Bean
    CommandLineRunner createInitialAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-admin.email:}") String adminEmail,
            @Value("${app.bootstrap-admin.password:}") String adminPassword) {

        return args -> {
            if (adminEmail == null || adminEmail.isBlank()
                    || adminPassword == null || adminPassword.length() < 12) {
                System.out.println(
                    "Initial admin not created. Configure BOOTSTRAP_ADMIN_EMAIL "
                    + "and a password of at least 12 characters."
                );
                return;
            }

            createAdminIfMissing(
                userRepository, passwordEncoder, adminEmail, adminPassword
            );
        };
    }

    @Transactional
    void createAdminIfMissing(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String email,
            String password) {

        String normalizedEmail = email.trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            System.out.println(
                "Bootstrap admin email already exists; no account changed."
            );
            return;
        }

        User admin = new User();
        admin.setEmail(normalizedEmail);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole("ADMIN");
        admin.setStatus("ACTIVE");

        userRepository.save(admin);

        System.out.println("Initial administrator account created.");
    }
}
