package br.com.senac.backend.controller;

import br.com.senac.backend.models.Role;
import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.models.request.AccountUpdateDTO;
import br.com.senac.backend.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Funcionários")
public class AccountController {
    private final AccountService service;


    @Operation(summary = "Cadastrar funcionário")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Account createEmployeeAccount( @Valid @RequestBody Account account) {
        return service.saveEmployeeAccount(account);
    }

    @Operation(summary = "Listar funcionários")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @GetMapping
    public List<Account> findAll() {
        return service.findAll();
    }

    @Operation(summary = "Ver minha conta")
    @GetMapping("/me")
    public Account findById(@RequestAttribute("account_id") Integer accountId) {
        return service.findById(accountId);
    }

    @Operation(summary = "Editar funcionário")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @PutMapping("/{id}")
    public Account update( @PathVariable Integer id, @Valid @RequestBody AccountUpdateDTO data){
        return service.update(id, data);
    }
    @Operation(summary = "Excluir funcionário")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete( @PathVariable Integer id) {
        service.delete(id);
    }
}
