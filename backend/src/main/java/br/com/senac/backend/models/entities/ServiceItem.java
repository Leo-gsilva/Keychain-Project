package br.com.senac.backend.models.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;

// Peça ou material do estoque usado num serviço
@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tb_service_items")
public class ServiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOrder serviceOrder;

    // Sem chave estrangeira: o item pode ser excluído do estoque sem apagar o histórico do serviço
    @Column(nullable = false)
    private Long itemId;

    // Cópia do código e do nome no momento do uso
    @Column(nullable = false)
    private String itemCode;

    @Column(nullable = false)
    private String itemName;

    @Column(nullable = false)
    private Integer quantity;

    // Preço de custo do item no momento do uso
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitCost;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCost;
}
