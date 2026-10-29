package br.com.senac.backend.service;

import br.com.senac.backend.models.SaleStatus;
import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.entities.Sale;
import br.com.senac.backend.models.entities.SaleItem;
import br.com.senac.backend.models.entities.ServiceOrder;
import br.com.senac.backend.models.response.ActivityResponse;
import br.com.senac.backend.models.response.MetricsResponse;
import br.com.senac.backend.repository.SaleRepository;
import br.com.senac.backend.repository.ServiceOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MetricsService {
    private final ServiceOrderRepository repoS;
    private final SaleRepository repoV;

    public MetricsResponse summary(LocalDate start, LocalDate end) {
        // Sem datas: do dia 1 do mês atual até hoje
        LocalDate today = LocalDate.now();
        if (start == null) start = today.withDayOfMonth(1);
        if (end == null) end = today;

        if (start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date cannot be after end date");
        }

        MetricsResponse.ServiceMetrics services = serviceMetrics(start, end);
        MetricsResponse.SaleMetrics sales = saleMetrics(start, end);

        BigDecimal revenue = services.getRevenue().add(sales.getRevenue());
        BigDecimal partsCost = services.getPartsCost().add(sales.getPartsCost());
        MetricsResponse.TotalMetrics totals =
                new MetricsResponse.TotalMetrics(revenue, partsCost, revenue.subtract(partsCost));

        return new MetricsResponse(start, end, services, sales, totals);
    }

    // Junta os últimos acontecimentos de serviços e vendas, do mais recente pro mais antigo
    @Transactional(readOnly = true)
    public List<ActivityResponse> recentActivity(int limit) {
        if (limit < 1 || limit > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit must be between 1 and 50");
        }
        Pageable top = PageRequest.of(0, limit);
        List<ActivityResponse> events = new ArrayList<>();

        for (ServiceOrder order : repoS.findByCreatedAtNotNullOrderByCreatedAtDesc(top)) {
            events.add(serviceEvent(ActivityResponse.Type.SERVICE_CREATED, order.getCreatedAt(), order));
        }
        for (ServiceOrder order : repoS.findByStatusChangedAtNotNullOrderByStatusChangedAtDesc(top)) {
            events.add(serviceEvent(ActivityResponse.Type.SERVICE_STATUS_CHANGED, order.getStatusChangedAt(), order));
        }
        for (Sale sale : repoV.findAllByOrderByCreatedAtDesc(top)) {
            events.add(saleEvent(ActivityResponse.Type.SALE_CREATED, sale.getCreatedAt(), sale));
        }
        for (Sale sale : repoV.findByCanceledAtNotNullOrderByCanceledAtDesc(top)) {
            events.add(saleEvent(ActivityResponse.Type.SALE_CANCELED, sale.getCanceledAt(), sale));
        }

        return events.stream()
                .sorted(Comparator.comparing(ActivityResponse::getAt).reversed())
                .limit(limit)
                .toList();
    }

    private MetricsResponse.ServiceMetrics serviceMetrics(LocalDate start, LocalDate end) {
        Map<ServiceStatus, Long> counts = new EnumMap<>(ServiceStatus.class);
        for (Object[] row : repoS.countByStatus(start, end)) {
            counts.put((ServiceStatus) row[0], (Long) row[1]);
        }
        long completed = counts.getOrDefault(ServiceStatus.COMPLETED, 0L);
        long inProgress = counts.getOrDefault(ServiceStatus.IN_PROGRESS, 0L);
        long pending = counts.getOrDefault(ServiceStatus.PENDING, 0L);
        long canceled = counts.getOrDefault(ServiceStatus.CANCELED, 0L);

        return new MetricsResponse.ServiceMetrics(
                completed + inProgress + pending, completed, inProgress, pending, canceled,
                orZero(repoS.sumServiceValue(ServiceStatus.COMPLETED, start, end)),
                orZero(repoS.sumPaidValue(start, end)),
                orZero(repoS.sumMaterialsCost(ServiceStatus.COMPLETED, start, end)));
    }

    private MetricsResponse.SaleMetrics saleMetrics(LocalDate start, LocalDate end) {
        // Vendas usam data e hora: pega do início do dia `start` até antes do dia seguinte ao `end`
        LocalDateTime from = start.atStartOfDay();
        LocalDateTime to = end.plusDays(1).atStartOfDay();

        Map<SaleStatus, Long> counts = new EnumMap<>(SaleStatus.class);
        for (Object[] row : repoV.countByStatus(from, to)) {
            counts.put((SaleStatus) row[0], (Long) row[1]);
        }
        long completed = counts.getOrDefault(SaleStatus.COMPLETED, 0L);
        long canceled = counts.getOrDefault(SaleStatus.CANCELED, 0L);
        Long itemsSold = repoV.sumItemsSold(SaleStatus.COMPLETED, from, to);

        return new MetricsResponse.SaleMetrics(
                completed + canceled, completed, canceled,
                orZero(repoV.sumTotal(SaleStatus.COMPLETED, from, to)),
                itemsSold == null ? 0 : itemsSold,
                orZero(repoV.sumItemsCost(SaleStatus.COMPLETED, from, to)));
    }

    private ActivityResponse serviceEvent(ActivityResponse.Type type, LocalDateTime at, ServiceOrder order) {
        return new ActivityResponse(type, at, order.getId(), order.getStatus().name(), order.getClientName(),
                order.getServiceType().getDescription(), order.getPaidValue());
    }

    private ActivityResponse saleEvent(ActivityResponse.Type type, LocalDateTime at, Sale sale) {
        int units = sale.getItems().stream().mapToInt(SaleItem::getQuantity).sum();
        return new ActivityResponse(type, at, sale.getId(), sale.getStatus().name(), sale.getClientName(),
                units + " un.", sale.getTotal());
    }

    private BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
