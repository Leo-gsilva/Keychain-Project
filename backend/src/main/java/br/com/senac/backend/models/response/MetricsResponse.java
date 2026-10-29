package br.com.senac.backend.models.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

// Resumo do período pedido pelo front. A Home usa os três blocos;
// a tela de Serviços usa `services` e a de Vendas usa `sales`
@Data
@AllArgsConstructor
public class MetricsResponse {
    private LocalDate start;
    private LocalDate end;
    private ServiceMetrics services;
    private SaleMetrics sales;
    private TotalMetrics totals;

    // Serviços pela data de contratação
    @Data
    @AllArgsConstructor
    public static class ServiceMetrics {
        // Ordens do período, sem contar as canceladas
        private long total;
        // Serviços realizados
        private long completed;
        private long inProgress;
        private long pending;
        private long canceled;
        // Valor cobrado dos serviços concluídos
        private BigDecimal revenue;
        // Valor pago de todos os serviços não cancelados
        private BigDecimal received;
        // Custo das peças e materiais usados nos serviços concluídos
        private BigDecimal partsCost;
    }

    // Vendas pela data de criação
    @Data
    @AllArgsConstructor
    public static class SaleMetrics {
        // Todas as vendas do período, inclusive canceladas
        private long total;
        private long completed;
        private long canceled;
        // Total das vendas concluídas
        private BigDecimal revenue;
        // Quantidade de itens das vendas concluídas
        private long itemsSold;
        // Custo dos itens das vendas concluídas
        private BigDecimal partsCost;
    }

    @Data
    @AllArgsConstructor
    public static class TotalMetrics {
        // Serviços concluídos + vendas concluídas
        private BigDecimal revenue;
        // Despesas com peças e materiais (custo dos itens do estoque em serviços e vendas)
        private BigDecimal partsCost;
        // Faturamento total - despesas com peças e materiais
        private BigDecimal estimatedProfit;
    }
}
