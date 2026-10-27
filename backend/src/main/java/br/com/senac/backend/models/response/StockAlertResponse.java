package br.com.senac.backend.models.response;

import br.com.senac.backend.models.StockAlertLevel;
import lombok.AllArgsConstructor;
import lombok.Data;

// O que o front recebe para cada item com estoque baixo ou zerado
@Data
@AllArgsConstructor
public class StockAlertResponse {
    private Long id;
    private String idCode;
    private String name;
    private Integer stock;
    private Integer minStock;
    private StockAlertLevel level;
    private String message;
}
