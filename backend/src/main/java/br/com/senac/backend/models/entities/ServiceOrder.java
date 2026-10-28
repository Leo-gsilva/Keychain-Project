package br.com.senac.backend.models.entities;

import br.com.senac.backend.models.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tb_services")
public class ServiceOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Client name is required")
    @Column(nullable = false)
    private String clientName;

    @NotBlank(message = "Phone number is required")
    @Column(nullable = false)
    private String clientPhone;

    private String clientCpfCnpj;

    @NotNull(message = "Service type is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceType serviceType;

    @NotNull(message = "Hiring date is required")
    @Column(nullable = false)
    private LocalDate hiringDate;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceStatus status;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @NotNull(message = "Service location is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceLocation location;

    private String address;

    @NotNull(message = "Service value is required")
    @PositiveOrZero(message = "Service value cannot be negative")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal serviceValue;

    @NotNull(message = "Paid value is required")
    @PositiveOrZero(message = "Paid value cannot be negative")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal paidValue;

    @NotNull(message = "Payment method is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;
}