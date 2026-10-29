package br.com.senac.backend.repository;
import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.entities.ServiceOrder;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByStatus(ServiceStatus status);

    // Métricas: período pela data de contratação, inclusivo nas duas pontas.
    // As somas devolvem null quando não há nenhum serviço no período

    // Cada linha: [status, quantidade]
    @Query("SELECT s.status, COUNT(s) FROM ServiceOrder s "
            + "WHERE s.hiringDate BETWEEN :start AND :end GROUP BY s.status")
    List<Object[]> countByStatus(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT SUM(s.serviceValue) FROM ServiceOrder s "
            + "WHERE s.status = :status AND s.hiringDate BETWEEN :start AND :end")
    BigDecimal sumServiceValue(@Param("status") ServiceStatus status,
                               @Param("start") LocalDate start, @Param("end") LocalDate end);

    // Valor pago de tudo que não foi cancelado
    @Query("SELECT SUM(s.paidValue) FROM ServiceOrder s "
            + "WHERE s.status <> br.com.senac.backend.models.ServiceStatus.CANCELED "
            + "AND s.hiringDate BETWEEN :start AND :end")
    BigDecimal sumPaidValue(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT SUM(si.totalCost) FROM ServiceItem si "
            + "WHERE si.serviceOrder.status = :status AND si.serviceOrder.hiringDate BETWEEN :start AND :end")
    BigDecimal sumMaterialsCost(@Param("status") ServiceStatus status,
                                @Param("start") LocalDate start, @Param("end") LocalDate end);

    // Atividade recente
    List<ServiceOrder> findByCreatedAtNotNullOrderByCreatedAtDesc(Pageable pageable);

    List<ServiceOrder> findByStatusChangedAtNotNullOrderByStatusChangedAtDesc(Pageable pageable);
}
