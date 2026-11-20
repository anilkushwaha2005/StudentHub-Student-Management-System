
package com.college.studentmanagement.security;

import com.college.studentmanagement.auth.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        System.out.println("REQUEST URI: " + request.getRequestURI());
        System.out.println("AUTH HEADER PRESENT: " + (header != null));
        System.out.println("AUTH HEADER BEARER: "
                + (header != null && header.startsWith("Bearer ")));

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            try {
                String email = jwtService.extractEmail(token);

                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    userRepository.findByEmailIgnoreCase(email)
                            .filter(user -> "ACTIVE".equals(user.getStatus()))
                            .ifPresent(user -> {
                                var authentication =
                                        new UsernamePasswordAuthenticationToken(
                                                user.getEmail(),
                                                null,
                                                List.of(new SimpleGrantedAuthority(
                                                        "ROLE_" + user.getRole()
                                                ))
                                        );

                                SecurityContextHolder.getContext()
                                        .setAuthentication(authentication);

                                System.out.println("Authenticated user: "
                                        + user.getEmail());
                                System.out.println("Authenticated role: "
                                        + user.getRole());
                            });
                }
            } catch (Exception ex) {
                System.out.println("JWT validation failed: "
                        + ex.getClass().getSimpleName());

                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"error\":\"Invalid or expired token\"}"
                );
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
