package br.com.senac.backend.service;

import br.com.senac.backend.models.PaymentMethod;
import br.com.senac.backend.models.SaleStatus;
import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.models.entities.Item;
import br.com.senac.backend.models.entities.Sale;
import br.com.senac.backend.models.entities.SaleItem;
import br.com.senac.backend.models.request.SaleRequest;
import br.com.senac.backend.repository.AccountRepository;
import br.com.senac.backend.repository.ItemRepository;
import br.com.senac.backend.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SaleService {
    private final SaleRepository repoS;
    private final ItemRepository repoI;
    private final AccountRepository repoA;

    // Tudo numa transação: se um item não tiver estoque, nenhum estoque é baixado
    @Transactional
    public Sale create(SaleRequest req, Integer sellerId) {
        if (req.getPaymentMethod() == PaymentMethod.TO_BE_DEFINED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment method must be defined for a sale");
        }

        Account seller = repoA.findById(sellerId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Logged account no longer exists"));

        // Junta linhas repetidas do mesmo item: [{1, 2}, {1, 3}] vira {1: 5}
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        for (SaleRequest.SaleItemRequest line : req.getItems()) {
            quantities.merge(line.getItemId(), line.getQuantity(), Integer::sum);
        }

        Sale sale = new Sale();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
            Item item = repoI.findById(entry.getKey()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found: " + entry.getKey()));
            int quantity = entry.getValue();

            if (item.getStock() < quantity) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Insufficient stock for " + item.getName() + " (available: " + item.getStock() + ")");
            }

            // Baixa do estoque
            item.setStock(item.getStock() - quantity);

            BigDecimal lineTotal = item.getSellPrice().multiply(BigDecimal.valueOf(quantity));
            sale.getItems().add(new SaleItem(null, sale, item.getId(), item.getIdCode(), item.getName(),
                    quantity, item.getSellPrice(), lineTotal));
            subtotal = subtotal.add(lineTotal);
        }

        BigDecimal discount = req.getDiscount() == null ? BigDecimal.ZERO : req.getDiscount();
        if (discount.compareTo(subtotal) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Discount cannot be greater than the subtotal");
        }

        // Parcelas só valem no cartão de crédito
        boolean credit = req.getPaymentMethod() == PaymentMethod.CREDIT_CARD;
        int installments = credit && req.getInstallments() != null ? req.getInstallments() : 1;

        sale.setClientName(blankToNull(req.getClientName()));
        sale.setClientPhone(blankToNull(req.getClientPhone()));
        sale.setClientCpf(blankToNull(req.getClientCpf()));
        sale.setPaymentMethod(req.getPaymentMethod());
        sale.setInstallments(installments);
        sale.setSubtotal(subtotal);
        sale.setDiscount(discount);
        sale.setTotal(subtotal.subtract(discount));
        sale.setObservations(blankToNull(req.getObservations()));
        sale.setStatus(SaleStatus.COMPLETED);
        sale.setCreatedAt(LocalDateTime.now());
        sale.setSeller(seller);

        return repoS.save(sale);
    }

    public List<Sale> findAll() {
        return repoS.findAllByOrderByCreatedAtDesc();
    }

    public Sale findById(Long id) {
        return repoS.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found: " + id));
    }

    // Cancelar devolve os itens ao estoque; a venda continua no histórico
    @Transactional
    public Sale cancel(Long id) {
        Sale sale = findById(id);
        if (sale.getStatus() == SaleStatus.CANCELED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sale is already canceled");
        }

        for (SaleItem line : sale.getItems()) {
            // Se o item foi excluído do estoque depois da venda, não há para onde devolver
            repoI.findById(line.getItemId())
                    .ifPresent(item -> item.setStock(item.getStock() + line.getQuantity()));
        }

        sale.setStatus(SaleStatus.CANCELED);
        sale.setCanceledAt(LocalDateTime.now());
        return repoS.save(sale);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
