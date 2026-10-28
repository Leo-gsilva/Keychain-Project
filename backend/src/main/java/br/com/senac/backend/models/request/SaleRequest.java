package br.com.senac.backend.models.request;

import br.com.senac.backend.models.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SaleRequest {

    private String clientName;

    private String clientPhone;

    private String clientCpf;

    @NotNull(message = "Payment method is mandatory")
    private PaymentMethod paymentMethod;

    @Min(value = 1, message = "Installments must be at least 1")
    @Max(value = 12, message = "Installments must be at most 12")
    private Integer installments;

    @PositiveOrZero(message = "Discount cannot be negative")
    private BigDecimal discount;

    private String observations;

    @NotEmpty(message = "The sale must have at least one item")
    private List<@Valid SaleItemRequest> items;

    @Data
    public static class SaleItemRequest {
        @NotNull(message = "Item id is mandatory")
        private Long itemId;

        @NotNull(message = "Quantity is mandatory")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
    }
}
