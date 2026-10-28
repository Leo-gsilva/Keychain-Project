package br.com.senac.backend.models.request;

import br.com.senac.backend.models.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.hibernate.validator.constraints.br.CPF;
import java.util.Date;

@Data
public class AccountUpdateDTO {
    // Só colocamos aqui o que ele pode realmente atualizar do perfil
    @NotBlank
    private String name;
    @NotNull
    private Date birthDate;
    @NotNull
    private Gender gender;

    private String phone;
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).{8,}$",
            message = "the password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character")
    private String password;
    @Email
    @Size(max = 100, message = "E-mail must be at most 100 characters")
    private String email;
    @CPF
    private String cpf;
}
