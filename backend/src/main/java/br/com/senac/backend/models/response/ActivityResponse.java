package br.com.senac.backend.models.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Um acontecimento do card "Últimas movimentações". O front monta o texto
@Data
@AllArgsConstructor
public class ActivityResponse {

    public enum Type { SERVICE_CREATED, SERVICE_STATUS_CHANGED, SALE_CREATED, SALE_CANCELED }

    private Type type;
    private LocalDateTime at;
    // Id do serviço ou da venda
    private Long referenceId;
    // Status atual do serviço ou da venda
    private String status;
    // Nulo em venda de balcão
    private String clientName;
    // Tipo do serviço ou quantidade de itens da venda
    private String detail;
    // Valor pago do serviço ou total da venda
    private BigDecimal amount;
}
