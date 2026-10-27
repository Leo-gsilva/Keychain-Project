package br.com.senac.backend.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.senac.backend.models.request.LoginRequest;
import br.com.senac.backend.models.response.LoginResponse;
import br.com.senac.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService service;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return service.login(req);
    }

}
