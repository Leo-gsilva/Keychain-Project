package br.com.senac.backend.controller;

import br.com.senac.backend.models.Role;
import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.models.request.AccountUpdateDTO;
import br.com.senac.backend.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {
    private final AccountService service;


    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Account createEmployeeAccount( @Valid @RequestBody Account account) {
        return service.saveEmployeeAccount(account);
    }

    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @GetMapping
    public List<Account> findAll() {
        return service.findAll();
    }

    @GetMapping("/me")
    public Account findById(@RequestAttribute("account_id") Integer accountId) {
        return service.findById(accountId);
    }

    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @PutMapping("/{id}")
    public Account update( @PathVariable Integer id, @Valid @RequestBody AccountUpdateDTO data){
        return service.update(id, data);
    }
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete( @PathVariable Integer id) {
        service.delete(id);
    }
}
