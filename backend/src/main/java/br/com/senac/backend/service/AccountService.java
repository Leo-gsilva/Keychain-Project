package br.com.senac.backend.service;

import br.com.senac.backend.models.Role;
import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.models.request.AccountUpdateDTO;
import br.com.senac.backend.repository.AccountRepository;
import br.com.senac.backend.utils.BCrypt;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AccountService {
    private final AccountRepository repoA;

    public AccountService(AccountRepository repoA) {
        this.repoA = repoA;
    }

    public Account saveEmployeeAccount(Account account) {
        account.setId(null);
        // Força a role a ser EMPLOYEE, ignorando o que vem do JSON
        account.setRole(Role.EMPLOYEE);
        account.setPassword(BCrypt.hash(account.getPassword()));

        // Guarda o CPF só com números, pra "123.456.789-09" e "12345678909" serem o
        // mesmo
        account.setCpf(account.getCpf().replaceAll("\\D", ""));

        if (repoA.findByCpf(account.getCpf()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF already registered");
        }
        if (repoA.findByEmail(account.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail already registered");
        }
        return repoA.save(account);
    }

    public List<Account> findAll() {
        return repoA.findAll();
    }

    public Account findById(Integer id) {
        return repoA.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found: " + id));
    }

    public Account update(Integer id, AccountUpdateDTO data) {
        // Busca a conta que já existe na base de dados
        Account account = findById(id);

        // Verifica se não está alterando um ADM
        if (account.getRole() != Role.EMPLOYEE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only employee accounts can be changed");
        }
        // Atualiza os dados base (que são sempre obrigatórios no DTO)
        account.setName(data.getName());
        account.setBirthDate(data.getBirthDate());
        account.setGender(data.getGender());
        account.setPhone(data.getPhone());

        // Regras Condicionais: Só atualiza se o utilizador enviou um valor válido
        if (data.getEmail() != null && !data.getEmail().isBlank()) {
            // Bloqueia se o e-mail já pertence a OUTRA conta (manter o próprio e-mail é
            // permitido)
            repoA.findByEmail(data.getEmail())
                    .filter(other -> !other.getId().equals(account.getId()))
                    .ifPresent(other -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail already registered");
                    });
            account.setEmail(data.getEmail());
        }

        if (data.getCpf() != null && !data.getCpf().isBlank()) {
            String cpf = data.getCpf().replaceAll("\\D", "");
            // Bloqueia se o CPF já pertence a OUTRA conta
            repoA.findByCpf(cpf)
                    .filter(other -> !other.getId().equals(account.getId()))
                    .ifPresent(other -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF already registered");
                    });
            account.setCpf(cpf);
        }

        if (data.getPassword() != null && !data.getPassword().isBlank()) {
            // Volta a gerar o hash com a função BCrypt.hash() se a password for alterada
            account.setPassword(BCrypt.hash(data.getPassword()));
        }

        // o Hibernate faz um UPDATE em vez de um INSERT.
        return repoA.save(account);
    }

    // Verifica se não está alterando um ADM
    public void delete(Integer id) {
        Account account = findById(id);
        if (account.getRole() != Role.EMPLOYEE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only employee accounts can be deleted");
        }
        repoA.delete(account);
    }

}
