package br.com.senac.backend.utils;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATRIBUTO_CONTA_ID = "account_id";
    public static final String ATRIBUTO_CONTA_ROLE = "account_role";

    private final JwtUtil jwtUtil;


    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Permite os pedidos OPTIONS (CORS)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }


        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token not informed");
        }

        // Valida o token e guarda como Integer
        Claims claims = jwtUtil.validateToken(header.substring(7));
        request.setAttribute(ATRIBUTO_CONTA_ID, Integer.valueOf(claims.getSubject()));
        request.setAttribute(ATRIBUTO_CONTA_ROLE, claims.get("role", String.class));

        String role = claims.get("role", String.class);

        var authority = new SimpleGrantedAuthority("ROLE_" + role);
        var authentication = new UsernamePasswordAuthenticationToken(
                claims.getSubject(),
                null,
                List.of(authority)
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        return true;
    }
}