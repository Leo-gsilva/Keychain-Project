package br.com.senac.backend.controller;

import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.models.request.AccountUpdateDTO;
import br.com.senac.backend.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
@Tag(name = "Funcionários", description = "Cadastro e gestão das contas de funcionários. A maioria das rotas é só para ADMINISTRATOR.")
public class AccountController {
        private final AccountService service;

        @Operation(summary = "Cadastrar funcionário", description = "**Só ADMINISTRATOR.** A conta é sempre criada como `EMPLOYEE` (o `role` do JSON é ignorado). "
                        + "A senha é salva criptografada e o CPF é salvo só com números. "
                        + "CPF e e-mail não podem já estar cadastrados.")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Funcionário cadastrado"),
                        @ApiResponse(responseCode = "400", description = "Campo obrigatório em branco, CPF/e-mail inválido ou senha fraca", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Requer perfil de administrador", content = @Content),
                        @ApiResponse(responseCode = "409", description = "CPF ou e-mail já cadastrado", content = @Content)
        })
        @PreAuthorize("hasRole('ADMINISTRATOR')")
        @PostMapping
        @ResponseStatus(HttpStatus.CREATED)
        public Account createEmployeeAccount(@Valid @RequestBody Account account) {
                return service.saveEmployeeAccount(account);
        }

        @Operation(summary = "Listar funcionários", description = "**Só ADMINISTRATOR.** Devolve todas as contas. A senha nunca aparece na resposta.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Lista de contas"),
                        @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Requer perfil de administrador", content = @Content)
        })
        @PreAuthorize("hasRole('ADMINISTRATOR')")
        @GetMapping
        public List<Account> findAll() {
                return service.findAll();
        }

        @Operation(summary = "Ver minha conta", description = "Devolve a conta do usuário logado, identificada pelo token.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Dados da conta logada"),
                        @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Conta do token não existe mais", content = @Content)
        })
        @GetMapping("/me")
        public Account findById(@RequestAttribute("account_id") Integer accountId) {
                return service.findById(accountId);
        }

        @Operation(summary = "Editar funcionário", description = "**Só ADMINISTRATOR.** Nome, data de nascimento e gênero são obrigatórios. "
                        + "E-mail, CPF e senha são opcionais: se não forem enviados, continuam como estão. "
                        + "Contas de administrador não podem ser editadas por aqui.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Conta atualizada"),
                        @ApiResponse(responseCode = "400", description = "Campo obrigatório em branco, CPF/e-mail inválido ou senha fraca", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Requer perfil de administrador, ou a conta editada não é de funcionário", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Conta não encontrada", content = @Content),
                        @ApiResponse(responseCode = "409", description = "CPF ou e-mail já pertence a outra conta", content = @Content)
        })
        @PreAuthorize("hasRole('ADMINISTRATOR')")
        @PutMapping("/{id}")
        public Account update(@PathVariable Integer id, @Valid @RequestBody AccountUpdateDTO data) {
                return service.update(id, data);
        }

        @Operation(summary = "Excluir funcionário", description = "**Só ADMINISTRATOR.** Contas de administrador não podem ser excluídas por aqui.")
        @ApiResponses({
                        @ApiResponse(responseCode = "204", description = "Conta excluída"),
                        @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Requer perfil de administrador, ou a conta não é de funcionário", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Conta não encontrada", content = @Content)
        })
        @PreAuthorize("hasRole('ADMINISTRATOR')")
        @DeleteMapping("/{id}")
        @ResponseStatus(HttpStatus.NO_CONTENT)
        public void delete(@PathVariable Integer id) {
                service.delete(id);
        }
}
