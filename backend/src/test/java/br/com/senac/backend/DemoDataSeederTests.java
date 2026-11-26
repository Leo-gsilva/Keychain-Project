package br.com.senac.backend;

import br.com.senac.backend.models.SaleStatus;
import br.com.senac.backend.models.StockAlertLevel;
import br.com.senac.backend.models.entities.Sale;
import br.com.senac.backend.models.entities.SaleItem;
import br.com.senac.backend.models.response.MetricsResponse;
import br.com.senac.backend.models.response.StockAlertResponse;
import br.com.senac.backend.repository.ItemRepository;
import br.com.senac.backend.repository.SaleRepository;
import br.com.senac.backend.repository.ServiceOrderRepository;
import br.com.senac.backend.service.ItemService;
import br.com.senac.backend.service.MetricsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// Roda o seeder de demonstração num H2 em memória: não toca no banco compartilhado
@SpringBootTest(properties = {
        "DEMO_SEED=true",
        "spring.datasource.url=jdbc:h2:mem:keychain-demo;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "SUPABASE_URL=",
        "SUPABASE_SERVICE_ROLE_KEY=",
        "JWT_SECRET=chave-de-teste-com-pelo-menos-32-bytes-1234567890",
        "ADMIN_EMAIL=admin@teste.com",
        "ADMIN_PASSWORD=Senha@123",
        "ADMIN_NAME=Admin Teste",
        "ADMIN_CPF=52998224725"
})
class DemoDataSeederTests {

    @Autowired private ItemRepository items;
    @Autowired private SaleRepository sales;
    @Autowired private ServiceOrderRepository services;
    @Autowired private ItemService itemService;
    @Autowired private MetricsService metrics;

    // Transacional só para ler as coleções lazy (itens da venda) dentro de uma sessão
    @Test
    @Transactional
    void enchePeloMenosOsDadosQueOsDashboardsUsam() {
        assertThat(items.findAll()).isNotEmpty().allSatisfy(item -> assertThat(item.getStock()).isNotNegative());

        // Avisos da Home: tem item zerado e item no mínimo
        List<StockAlertResponse> alerts = itemService.getStockAlerts();
        assertThat(alerts).extracting(StockAlertResponse::getLevel)
                .contains(StockAlertLevel.OUT_OF_STOCK, StockAlertLevel.LOW_STOCK);

        // Nenhuma venda no futuro, e o total bate com os itens menos o desconto
        LocalDateTime now = LocalDateTime.now();
        for (Sale sale : sales.findAll()) {
            assertThat(sale.getCreatedAt()).isBeforeOrEqualTo(now);
            BigDecimal subtotal = sale.getItems().stream().map(SaleItem::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            assertThat(sale.getTotal()).isEqualByComparingTo(subtotal.subtract(sale.getDiscount()));
            if (sale.getStatus() == SaleStatus.CANCELED) {
                assertThat(sale.getCanceledAt()).isAfterOrEqualTo(sale.getCreatedAt()).isBeforeOrEqualTo(now);
            }
        }

        // Hoje tem movimento de vendas e de serviços em todos os status, e o lucro é positivo
        LocalDate today = LocalDate.now();
        MetricsResponse day = metrics.summary(today, today);
        assertThat(day.getSales().getCompleted()).isPositive();
        assertThat(day.getSales().getCanceled()).isEqualTo(1);
        assertThat(day.getServices().getCompleted()).isEqualTo(4);
        assertThat(day.getServices().getInProgress()).isEqualTo(2);
        assertThat(day.getServices().getPending()).isEqualTo(2);
        assertThat(day.getTotals().getEstimatedProfit()).isPositive();

        // Serviço em aberto tem previsão e o feed de atividade não fica vazio
        assertThat(services.findByStatus(br.com.senac.backend.models.ServiceStatus.PENDING))
                .allSatisfy(order -> assertThat(order.getScheduledAt()).isNotNull());
        assertThat(metrics.recentActivity(10)).hasSize(10);
    }
}
