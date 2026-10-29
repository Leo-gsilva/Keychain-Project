package br.com.senac.backend.models.response;

import br.com.senac.backend.models.PaymentMethod;
import br.com.senac.backend.models.ServiceLocation;
import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.ServiceType;
import br.com.senac.backend.models.entities.ServiceItem;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// O que o front recebe para cada serviço
@Data
@AllArgsConstructor
public class ServiceResponse {
    private Long id;
    private String clientName;
    private String clientPhone;
    private String clientCpfCnpj;
    private ServiceType serviceType;
    private LocalDate hiringDate;
    private ServiceStatus status;
    private String observations;
    private ServiceLocation location;
    private String address;
    private BigDecimal serviceValue;
    private BigDecimal paidValue;
    private PaymentMethod paymentMethod;
    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt;
    private LocalDateTime statusChangedAt;
    private List<ServiceItem> items;
    // Soma do custo das peças e materiais usados
    private BigDecimal materialsCost;
}
