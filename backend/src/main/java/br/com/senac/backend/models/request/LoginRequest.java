package br.com.senac.backend.models.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "e-mail is mandatory")
    @Email(message = "e-mail is invalid")
    private String email;

    // @ToString.Exclude (proibe o toString do lombok de acessar a senha)
    @NotBlank(message = "password is mandatory")
    private String password;
}
