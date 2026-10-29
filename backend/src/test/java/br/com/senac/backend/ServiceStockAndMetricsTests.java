package br.com.senac.backend;

import br.com.senac.backend.models.PaymentMethod;
import br.com.senac.backend.models.ServiceLocation;
import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.ServiceType;
import br.com.senac.backend.models.entities.Item;
import br.com.senac.backend.models.request.SaleRequest;
import br.com.senac.backend.models.request.ServiceRequest;
import br.com.senac.backend.models.response.MetricsResponse;
import br.com.senac.backend.models.response.ServiceResponse;
import br.com.senac.backend.repository.AccountRepository;
import br.com.senac.backend.repository.ItemRepository;
import br.com.senac.backend.service.MetricsService;
import br.com.senac.backend.service.SaleService;
import br.com.senac.backend.service.ServiceOrderService;
import br.com.senac.backend.utils.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Roda num H2 em memória: não toca no banco compartilhado
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:keychain;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
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
@AutoConfigureMockMvc
class ServiceStockAndMetricsTests {

    // Serviços dos testes de estoque ficam numa data antiga, fora do período das métricas
    private static final LocalDate OLD_DATE = LocalDate.of(2000, 1, 1);

    @Autowired private ServiceOrderService services;
    @Autowired private SaleService sales;
    @Autowired private MetricsService metrics;
    @Autowired private ItemRepository items;
    @Autowired private AccountRepository accounts;
    @Autowired private JwtUtil jwt;
    @Autowired private MockMvc mvc;

    @Test
    void cadastroSoRegistraAsPecasSemBaixarEstoque() {
        Item item = newItem(10, "5.00");

        ServiceResponse created = services.saveService(request(OLD_DATE, line(item, 3)));

        assertThat(stock(item)).isEqualTo(10);
        assertThat(created.getStatus()).isEqualTo(ServiceStatus.PENDING);
        assertThat(created.getItems()).hasSize(1);
        assertThat(created.getMaterialsCost()).isEqualByComparingTo("15.00");
        assertThat(created.getCreatedAt()).isNotNull();
    }

    @Test
    void concluirBaixaEstoqueESairDeConcluidoDevolve() {
        Item item = newItem(10, "5.00");
        Long id = services.saveService(request(OLD_DATE, line(item, 3))).getId();

        services.updateStatus(id, ServiceStatus.IN_PROGRESS);
        assertThat(stock(item)).isEqualTo(10);

        services.updateStatus(id, ServiceStatus.COMPLETED);
        assertThat(stock(item)).isEqualTo(7);

        // Voltar pra execução devolve
        services.updateStatus(id, ServiceStatus.IN_PROGRESS);
        assertThat(stock(item)).isEqualTo(10);

        // Concluir de novo baixa de novo; mandar o mesmo status não baixa duas vezes
        services.updateStatus(id, ServiceStatus.COMPLETED);
        services.updateStatus(id, ServiceStatus.COMPLETED);
        assertThat(stock(item)).isEqualTo(7);

        // Cancelar devolve
        ServiceResponse canceled = services.updateStatus(id, ServiceStatus.CANCELED);
        assertThat(stock(item)).isEqualTo(10);
        assertThat(canceled.getStatusChangedAt()).isNotNull();
    }

    @Test
    void concluirSemEstoqueDa409ENaoMudaNada() {
        Item enough = newItem(10, "1.00");
        Item scarce = newItem(1, "1.00");
        Long id = services.saveService(request(OLD_DATE, line(enough, 2), line(scarce, 5))).getId();

        assertThatThrownBy(() -> services.updateStatus(id, ServiceStatus.COMPLETED))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));

        // Rollback: nenhum item foi baixado e o status continua o mesmo
        assertThat(stock(enough)).isEqualTo(10);
        assertThat(stock(scarce)).isEqualTo(1);
        assertThat(services.findById(id).getStatus()).isEqualTo(ServiceStatus.PENDING);
    }

    @Test
    void editarSemItemsMantemAsPecas() {
        Item item = newItem(10, "5.00");
        Long id = services.saveService(request(OLD_DATE, line(item, 3))).getId();

        ServiceRequest edit = request(OLD_DATE);
        edit.setItems(null);
        edit.setClientName("Nome editado");
        ServiceResponse updated = services.update(id, edit);

        assertThat(updated.getClientName()).isEqualTo("Nome editado");
        assertThat(updated.getItems()).hasSize(1);
        assertThat(updated.getItems().get(0).getQuantity()).isEqualTo(3);
    }

    @Test
    void editarItemsDeServicoConcluidoAjustaEstoque() {
        Item first = newItem(10, "5.00");
        Item second = newItem(10, "2.00");
        Long id = services.saveService(request(OLD_DATE, line(first, 3))).getId();
        services.updateStatus(id, ServiceStatus.COMPLETED);
        assertThat(stock(first)).isEqualTo(7);

        ServiceResponse updated = services.update(id, request(OLD_DATE, line(first, 1), line(second, 4)));

        assertThat(stock(first)).isEqualTo(9);
        assertThat(stock(second)).isEqualTo(6);
        assertThat(updated.getMaterialsCost()).isEqualByComparingTo("13.00");

        // Lista vazia tira todas as peças e devolve tudo
        services.update(id, request(OLD_DATE));
        assertThat(stock(first)).isEqualTo(10);
        assertThat(stock(second)).isEqualTo(10);
        assertThat(services.findById(id).getItems()).isEmpty();
    }

    @Test
    void editarServicoNaoConcluidoSoTrocaALista() {
        Item item = newItem(10, "5.00");
        Long id = services.saveService(request(OLD_DATE, line(item, 3))).getId();

        services.update(id, request(OLD_DATE, line(item, 8)));

        assertThat(stock(item)).isEqualTo(10);
        assertThat(services.findById(id).getItems().get(0).getQuantity()).isEqualTo(8);
    }

    @Test
    void excluirServicoConcluidoDevolveAsPecas() {
        Item item = newItem(10, "5.00");
        Long id = services.saveService(request(OLD_DATE, line(item, 4))).getId();
        services.updateStatus(id, ServiceStatus.COMPLETED);
        assertThat(stock(item)).isEqualTo(6);

        services.delete(id);

        assertThat(stock(item)).isEqualTo(10);
    }

    @Test
    void metricasSomamServicosEVendasMenosOCustoDasPecas() {
        // Período isolado: só este teste cria vendas e serviços com data de hoje
        LocalDate today = LocalDate.now();
        Item part = newItem(50, "10.00");   // custo 10, venda 25

        // Serviço concluído: cobrou 100, usou 2 peças (custo 20)
        Long done = services.saveService(withValue(request(today, line(part, 2)), "100.00", "100.00")).getId();
        services.updateStatus(done, ServiceStatus.COMPLETED);
        // Em execução: entra na contagem e no recebido, não no faturamento nem nas despesas
        Long running = services.saveService(withValue(request(today, line(part, 1)), "80.00", "30.00")).getId();
        services.updateStatus(running, ServiceStatus.IN_PROGRESS);
        // Pendente e cancelado
        services.saveService(withValue(request(today), "50.00", "0.00"));
        Long canceled = services.saveService(withValue(request(today), "70.00", "70.00")).getId();
        services.updateStatus(canceled, ServiceStatus.CANCELED);

        Integer adminId = accounts.findByEmail("admin@teste.com").orElseThrow().getId();
        // Venda concluída: 3 x 25 = 75, custo 30
        sales.create(sale(part, 3), adminId);
        // Venda cancelada: não entra no faturamento nem nas despesas
        Long canceledSale = sales.create(sale(part, 1), adminId).getId();
        sales.cancel(canceledSale);

        // Custo congelado: mudar o preço de custo depois não muda o passado
        part.setCostPrice(new BigDecimal("99.00"));
        items.save(part);

        MetricsResponse m = metrics.summary(today, today);

        assertThat(m.getServices().getTotal()).isEqualTo(3);
        assertThat(m.getServices().getCompleted()).isEqualTo(1);
        assertThat(m.getServices().getInProgress()).isEqualTo(1);
        assertThat(m.getServices().getPending()).isEqualTo(1);
        assertThat(m.getServices().getCanceled()).isEqualTo(1);
        assertThat(m.getServices().getRevenue()).isEqualByComparingTo("100.00");
        assertThat(m.getServices().getReceived()).isEqualByComparingTo("130.00");
        assertThat(m.getServices().getPartsCost()).isEqualByComparingTo("20.00");

        assertThat(m.getSales().getTotal()).isEqualTo(2);
        assertThat(m.getSales().getCompleted()).isEqualTo(1);
        assertThat(m.getSales().getCanceled()).isEqualTo(1);
        assertThat(m.getSales().getRevenue()).isEqualByComparingTo("75.00");
        assertThat(m.getSales().getItemsSold()).isEqualTo(3);
        assertThat(m.getSales().getPartsCost()).isEqualByComparingTo("30.00");

        assertThat(m.getTotals().getRevenue()).isEqualByComparingTo("175.00");
        assertThat(m.getTotals().getPartsCost()).isEqualByComparingTo("50.00");
        assertThat(m.getTotals().getEstimatedProfit()).isEqualByComparingTo("125.00");

        // Período sem nada devolve zeros, não null
        MetricsResponse empty = metrics.summary(LocalDate.of(1990, 1, 1), LocalDate.of(1990, 1, 2));
        assertThat(empty.getTotals().getRevenue()).isEqualByComparingTo("0");
        assertThat(empty.getSales().getItemsSold()).isZero();

        assertThat(metrics.recentActivity(10)).isNotEmpty();
    }

    @Test
    void periodoInvertidoDa400() {
        assertThatThrownBy(() -> metrics.summary(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void metricasSaoSoParaAdministrador() throws Exception {
        String admin = "Bearer " + jwt.generateToken(1, "admin@teste.com", "ADMINISTRATOR");
        String employee = "Bearer " + jwt.generateToken(2, "func@teste.com", "EMPLOYEE");

        mvc.perform(get("/metrics").param("start", "2026-01-01").param("end", "2026-01-31")
                        .header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.estimatedProfit").exists());
        mvc.perform(get("/metrics/activity").header("Authorization", admin))
                .andExpect(status().isOk());

        mvc.perform(get("/metrics").header("Authorization", employee))
                .andExpect(status().isForbidden());
        mvc.perform(get("/metrics/activity").header("Authorization", employee))
                .andExpect(status().isForbidden());
    }

    // --- auxiliares ---

    private Item newItem(int stock, String cost) {
        String code = UUID.randomUUID().toString().substring(0, 8);
        return items.save(new Item(null, code, "Peça " + code, "Marca", null,
                new BigDecimal(cost), new BigDecimal("25.00"), stock, 0));
    }

    private int stock(Item item) {
        return items.findById(item.getId()).orElseThrow().getStock();
    }

    private ServiceRequest.ServiceItemRequest line(Item item, int quantity) {
        ServiceRequest.ServiceItemRequest line = new ServiceRequest.ServiceItemRequest();
        line.setItemId(item.getId());
        line.setQuantity(quantity);
        return line;
    }

    private ServiceRequest request(LocalDate hiringDate, ServiceRequest.ServiceItemRequest... lines) {
        ServiceRequest r = new ServiceRequest();
        r.setClientName("Cliente Teste");
        r.setClientPhone("(11) 99999-9999");
        r.setServiceType(ServiceType.LOCK_REPAIR);
        r.setHiringDate(hiringDate);
        r.setLocation(ServiceLocation.STORE);
        r.setServiceValue(new BigDecimal("100.00"));
        r.setPaidValue(BigDecimal.ZERO);
        r.setPaymentMethod(PaymentMethod.PIX);
        r.setItems(List.of(lines));
        return r;
    }

    private ServiceRequest withValue(ServiceRequest r, String value, String paid) {
        r.setServiceValue(new BigDecimal(value));
        r.setPaidValue(new BigDecimal(paid));
        return r;
    }

    private SaleRequest sale(Item item, int quantity) {
        SaleRequest.SaleItemRequest line = new SaleRequest.SaleItemRequest();
        line.setItemId(item.getId());
        line.setQuantity(quantity);
        SaleRequest r = new SaleRequest();
        r.setPaymentMethod(PaymentMethod.PIX);
        r.setItems(List.of(line));
        return r;
    }
}
