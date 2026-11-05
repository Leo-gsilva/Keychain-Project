package br.com.senac.backend;

import br.com.senac.backend.models.PaymentMethod;
import br.com.senac.backend.models.entities.Item;
import br.com.senac.backend.models.entities.Sale;
import br.com.senac.backend.models.request.SaleRequest;
import br.com.senac.backend.repository.AccountRepository;
import br.com.senac.backend.repository.ItemRepository;
import br.com.senac.backend.service.SaleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Roda num H2 em memória: não toca no banco compartilhado
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:keychain-sales;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
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
class SaleUpdateTests {

    @Autowired private SaleService sales;
    @Autowired private ItemRepository items;
    @Autowired private AccountRepository accounts;

    @Test
    void editarAjustaOEstoquePelaDiferenca() {
        Item a = newItem(10, "10.00");
        Item b = newItem(5, "20.00");
        Sale sale = sales.create(request(line(a, 3)), adminId());
        assertThat(stock(a)).isEqualTo(7);

        // Tira 1 de A e adiciona 2 de B
        Sale edited = sales.update(sale.getId(), request(line(a, 2), line(b, 2)));

        assertThat(stock(a)).isEqualTo(8);
        assertThat(stock(b)).isEqualTo(3);
        assertThat(edited.getItems()).hasSize(2);
        assertThat(edited.getSubtotal()).isEqualByComparingTo("100.00"); // (2 + 2) x 25,00
    }

    @Test
    void itemQueJaEstavaNaVendaMantemOPrecoDaVenda() {
        Item a = newItem(10, "10.00");
        Sale sale = sales.create(request(line(a, 1)), adminId());

        Item changed = items.findById(a.getId()).orElseThrow();
        changed.setSellPrice(new BigDecimal("99.00"));
        items.save(changed);

        Sale edited = sales.update(sale.getId(), request(line(a, 2)));

        assertThat(edited.getItems().get(0).getUnitPrice()).isEqualByComparingTo("25.00");
        assertThat(edited.getTotal()).isEqualByComparingTo("50.00");
    }

    @Test
    void estoqueInsuficienteNaoAlteraNada() {
        Item a = newItem(4, "10.00");
        Sale sale = sales.create(request(line(a, 2)), adminId());

        // Pode usar as 2 já vendidas + 2 em estoque = 4; pedir 5 falha
        assertThatThrownBy(() -> sales.update(sale.getId(), request(line(a, 5))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        assertThat(stock(a)).isEqualTo(2);
        assertThat(sales.findById(sale.getId()).getTotal()).isEqualByComparingTo("50.00");
    }

    @Test
    void vendaCanceladaNaoPodeSerEditada() {
        Item a = newItem(5, "10.00");
        Sale sale = sales.create(request(line(a, 1)), adminId());
        sales.cancel(sale.getId());

        assertThatThrownBy(() -> sales.update(sale.getId(), request(line(a, 1))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(stock(a)).isEqualTo(5);
    }

    // --- auxiliares ---

    private Integer adminId() {
        return accounts.findByEmail("admin@teste.com").orElseThrow().getId();
    }

    private Item newItem(int stock, String cost) {
        String code = UUID.randomUUID().toString().substring(0, 8);
        return items.save(new Item(null, code, "Peça " + code, "Marca", null,
                new BigDecimal(cost), new BigDecimal("25.00"), stock, 0));
    }

    private int stock(Item item) {
        return items.findById(item.getId()).orElseThrow().getStock();
    }

    private SaleRequest.SaleItemRequest line(Item item, int quantity) {
        SaleRequest.SaleItemRequest line = new SaleRequest.SaleItemRequest();
        line.setItemId(item.getId());
        line.setQuantity(quantity);
        return line;
    }

    private SaleRequest request(SaleRequest.SaleItemRequest... lines) {
        SaleRequest r = new SaleRequest();
        r.setPaymentMethod(PaymentMethod.PIX);
        r.setItems(Arrays.asList(lines));
        return r;
    }
}
