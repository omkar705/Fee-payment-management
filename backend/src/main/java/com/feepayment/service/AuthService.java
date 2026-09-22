package com.feepayment.service;

import com.feepayment.config.JwtUtil;
import com.feepayment.model.*;
import com.feepayment.repository.PasswordResetTokenRepository;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final AuditLogService auditLogService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        // Authenticate credentials
        try {
            Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            throw new BadCredentialsException("Invalid credentials.");
        }

        // Load user
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials."));

        // Verify role matches selection
        String dbRole = user.getRole().getName();
        String requestedRole = request.getRole().toUpperCase();

        if (!dbRole.equals(requestedRole)) {
            throw new BadCredentialsException("Invalid credentials or selected role does not match this account.");
        }

        // Check account enabled
        if (!user.getEnabled()) {
            throw new BadCredentialsException("Your account has been deactivated. Please contact the administrator.");
        }

        // Generate JWT
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails, dbRole);

        // Get display name
        String displayName = getDisplayName(user);

        // Audit Log entry for login event
        auditLogService.logAction(
                user.getEmail(),
                "USER_LOGIN",
                "User",
                String.valueOf(user.getId()),
                "Successful login as " + dbRole
        );

        return new LoginResponse(token, user.getEmail(), dbRole, displayName, user.getId());
    }

    private String getDisplayName(User user) {
        String role = user.getRole().getName();
        if ("STUDENT".equals(role)) {
            return studentRepository.findByUserId(user.getId())
                    .map(Student::getName)
                    .orElse(user.getEmail());
        } else if ("ADMIN".equals(role)) {
            return "Administrator";
        } else if ("ACCOUNTS".equals(role)) {
            return "Accounts Officer";
        }
        return user.getEmail();
    }

    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {
        // Always respond generically to prevent email enumeration
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String dbRole = user.getRole().getName();

            // Role must match
            if (!dbRole.equalsIgnoreCase(request.getRole())) {
                return "If the account exists, a password reset link has been sent to your registered email.";
            }

            // Delete existing tokens for this user
            tokenRepository.deleteByUser(user);

            // Create new token
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setUserId(user.getId());
            resetToken.setToken(UUID.randomUUID().toString());
            resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
            resetToken.setUsed(false);
            tokenRepository.save(resetToken);

            // In a real system, send an email here. For demo, log the token.
            System.out.println("[DEMO] Password reset token for " + user.getEmail() + ": " + resetToken.getToken());
        }

        return "If the account exists, a password reset link has been sent to your registered email.";
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        PasswordResetToken resetToken = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset link."));

        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("Reset link has expired. Please request a new one.");
        }

        if (resetToken.getUsed()) {
            throw new IllegalArgumentException("This reset link has already been used.");
        }

        // Update password
        User user = resetToken.getUser();
        userRepository.updatePassword(user.getId(), passwordEncoder.encode(request.getNewPassword()));

        // Mark token as used
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }
}
