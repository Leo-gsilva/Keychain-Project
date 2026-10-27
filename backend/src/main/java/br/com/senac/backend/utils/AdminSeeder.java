package br.com.senac.backend.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import br.com.senac.backend.models.Gender;
import br.com.senac.backend.models.Role;
import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.repository.AccountRepository;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    private final AccountRepository repository;

    @Value("${ADMIN_EMAIL}")
    private String adminEmail;
    @Value("${ADMIN_PASSWORD}")
    private String adminPassword;
    @Value("${ADMIN_NAME}")
    private String adminName;
    @Value("${ADMIN_CPF}")
    private String adminCpf;

    @Override
    public void run(String... args) throws Exception {
        if (repository.findByEmail(adminEmail).isPresent()) {
            return;
        }
        Account admin = new Account();
        admin.setEmail(adminEmail);
        admin.setPassword(BCrypt.hash(adminPassword));
        admin.setName(adminName);
        admin.setCpf(adminCpf);
        admin.setRole(Role.ADMINISTRATOR);
        admin.setGender(Gender.OTHERS);
        admin.setBirthDate(java.sql.Date.valueOf("1990-01-01"));

        repository.save(admin);
    }

}
