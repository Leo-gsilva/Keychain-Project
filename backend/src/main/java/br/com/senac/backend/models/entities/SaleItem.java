package br.com.senac.backend.models.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tb_sale_items")
public class SaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    // Sem chave estrangeira: o item pode ser excluído do estoque sem apagar o histórico da venda
    @Column(nullable = false)
    private Long itemId;

    // Cópia do código e do nome no momento da venda
    @Column(nullable = false)
    private String itemCode;

    @Column(nullable = false)
    private String itemName;

    @Column(nullable = false)
    private Integer quantity;

    // Preço de venda do item no momento da venda
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    // Preço de custo do item no momento da venda (usado no lucro estimado).
    // Nulo nas vendas feitas antes da coluna existir; aí as métricas usam o custo atual do item
    @JsonIgnore
    @Column(precision = 10, scale = 2)
    private BigDecimal unitCost;
}
