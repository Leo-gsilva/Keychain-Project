package br.com.senac.backend.models.request;

import br.com.senac.backend.models.PaymentMethod;
import br.com.senac.backend.models.ServiceLocation;
import br.com.senac.backend.models.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

// O que o front envia para cadastrar ou editar um serviço.
// Não tem id (vem pela URL) nem status (nasce PENDING e só muda por PATCH /services/{id}/status).
@Data
public class ServiceRequest {

    @NotBlank(message = "Client name is mandatory")
    private String clientName;

    @NotBlank(message = "Phone number is mandatory")
    @Pattern(regexp = "^\\([0-9]{2}\\) 9?[0-9]{4}-[0-9]{4}$", message = "Phone number is invalid")
    private String clientPhone;

    // Opcional. Aceita CPF ou CNPJ, com ou sem pontuação
    @Pattern(regexp = "^([0-9]{11}|[0-9]{14}|[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}|[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}/[0-9]{4}-[0-9]{2})?$",
            message = "CPF/CNPJ is invalid")
    private String clientCpfCnpj;

    @NotNull(message = "Service type is mandatory")
    private ServiceType serviceType;

    @NotNull(message = "Hiring date is mandatory")
    private LocalDate hiringDate;

    private String observations;

    @NotNull(message = "Service location is mandatory")
    private ServiceLocation location;

    // Obrigatório quando location = ON_SITE (checado no service)
    private String address;

    @NotNull(message = "Service value is mandatory")
    @PositiveOrZero(message = "Service value cannot be negative")
    private BigDecimal serviceValue;

    @NotNull(message = "Paid value is mandatory")
    @PositiveOrZero(message = "Paid value cannot be negative")
    private BigDecimal paidValue;

    @NotNull(message = "Payment method is mandatory")
    private PaymentMethod paymentMethod;
}
