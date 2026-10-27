package br.com.senac.backend.models.entities;


import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tb_itens")
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Id Code is mandatory")
    @Column(nullable = false, unique = true)
    private String idCode;

    @NotBlank(message = "Name is mandatory")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Brand is mandatory")
    @Column(nullable = false)
    private String brand;

    private String description;

    @NotNull(message = "Cost Price is mandatory")
    @PositiveOrZero(message = "Cost Price cannot be negative")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal costPrice;

    @NotNull(message = "Sell Price is mandatory")
    @PositiveOrZero(message = "Sell Price cannot be negative")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal sellPrice;

    @NotNull(message = "Stock is mandatory")
    @Min(value = 0, message = "Stock cannot be negative")
    @Column(nullable = false)
    private Integer stock;

    @NotNull(message = "Min Stock is mandatory")
    @Min(value = 0, message = "Min Stock cannot be negative")
    @Column(nullable = false)
    private Integer minStock;









}
