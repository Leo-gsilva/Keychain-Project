package br.com.senac.backend.models.entities;


import br.com.senac.backend.models.Gender;
import br.com.senac.backend.models.Role;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.br.CPF;

import java.util.Date;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tb_accounts",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"email"}),
                @UniqueConstraint(columnNames = {"cpf"})
        })
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Email
    @NotBlank(message = "E-mail is mandatory")
    @Size(max = 100, message = "E-mail must be at most 100 characters")
    @Column(nullable = false, length = 100)
    private String email;

    @NotBlank(message = "Password is mandatory")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).{8,}$",
            message = "The password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password;

    // Definido sempre pelo back (EMPLOYEE no cadastro); o que vier no JSON é ignorado
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Role role;

    @NotBlank(message = "Name is mandatory")
    @Column(nullable = false)
    private String name;

    @CPF
    @NotBlank(message = "CPF is mandatory")
    @Column(nullable = false)
    private String cpf;

    @NotNull(message = "Birth Date is mandatory")
    @Column(nullable = false)
    private Date birthDate;

    @NotNull(message = "Gender is mandatory")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Pattern(regexp = "^\\([0-9]{2}\\) 9?[0-9]{4}-[0-9]{4}$")
    private String phone;
}
