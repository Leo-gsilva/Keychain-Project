package br.com.senac.backend.repository;

import br.com.senac.backend.models.SaleStatus;
import br.com.senac.backend.models.entities.Sale;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    // Mais recentes primeiro
    List<Sale> findAllByOrderByCreatedAtDesc();

    // Métricas: intervalo [from, to). As somas devolvem null quando não há vendas no período

    // Cada linha: [status, quantidade]
    @Query("SELECT s.status, COUNT(s) FROM Sale s "
            + "WHERE s.createdAt >= :from AND s.createdAt < :to GROUP BY s.status")
    List<Object[]> countByStatus(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT SUM(s.total) FROM Sale s "
            + "WHERE s.status = :status AND s.createdAt >= :from AND s.createdAt < :to")
    BigDecimal sumTotal(@Param("status") SaleStatus status,
                        @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT SUM(si.quantity) FROM SaleItem si "
            + "WHERE si.sale.status = :status AND si.sale.createdAt >= :from AND si.sale.createdAt < :to")
    Long sumItemsSold(@Param("status") SaleStatus status,
                      @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Custo dos itens vendidos pelo preço de custo do momento da venda.
    // Vendas antigas (sem custo guardado) usam o custo atual do item; item já excluído fica de fora
    @Query("SELECT SUM(si.quantity * COALESCE(si.unitCost, i.costPrice)) FROM SaleItem si "
            + "LEFT JOIN Item i ON i.id = si.itemId "
            + "WHERE si.sale.status = :status AND si.sale.createdAt >= :from AND si.sale.createdAt < :to")
    BigDecimal sumItemsCost(@Param("status") SaleStatus status,
                            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Atividade recente
    List<Sale> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Sale> findByCanceledAtNotNullOrderByCanceledAtDesc(Pageable pageable);
}
