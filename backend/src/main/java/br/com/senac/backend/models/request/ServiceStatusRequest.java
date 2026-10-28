package br.com.senac.backend.models.request;

import br.com.senac.backend.models.ServiceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

// Corpo do PATCH /services/{id}/status
@Data
public class ServiceStatusRequest {

    @NotNull(message = "Status is mandatory")
    private ServiceStatus status;
}
