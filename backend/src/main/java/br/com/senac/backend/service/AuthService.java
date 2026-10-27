package br.com.senac.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.models.request.LoginRequest;
import br.com.senac.backend.models.response.LoginResponse;
import br.com.senac.backend.repository.AccountRepository;
import br.com.senac.backend.utils.BCrypt;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository repositoryAccount;

    public LoginResponse login(LoginRequest req) {
        Account account = repositoryAccount.findByEmail(req.getEmail())
                .filter(c -> BCrypt.checkPassword(req.getPassword(), c.getPassword()))
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail or password is invalid"));
        return new LoginResponse("trocarPeloJWT");
    }
}