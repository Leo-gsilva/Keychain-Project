package br.com.senac.backend.service;

import br.com.senac.backend.models.StockAlertLevel;
import br.com.senac.backend.models.entities.Item;
import br.com.senac.backend.models.response.StockAlertResponse;
import br.com.senac.backend.repository.ItemRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ItemService {
    private final ItemRepository repoI;

    public ItemService(ItemRepository repoI) {
        this.repoI = repoI;
    }

    public Item saveItem(Item item) {
        // Garante que é um cadastro novo, ignorando id vindo do JSON
        item.setId(null);

        // Padroniza o código: "  ch-001 " vira "CH-001"
        item.setIdCode(normalizeIdCode(item.getIdCode()));

        // Bloqueia código de identificação repetido
        if (repoI.existsByIdCode(item.getIdCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Item code already exists: " + item.getIdCode());
        }
        return repoI.save(item);
    }

    public List<Item> findAll() {
        return repoI.findAll();
    }

    public Item findById(Long id) {
        return repoI.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found: " + id));
    }

    public Item update(Long id, Item data) {
        // Busca o item que já existe na base de dados
        Item item = findById(id);

        String code = normalizeIdCode(data.getIdCode());

        // Bloqueia se o código já pertence a OUTRO item (manter o próprio código é permitido)
        repoI.findByIdCode(code)
                .filter(other -> !other.getId().equals(item.getId()))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Item code already exists: " + code);
                });

        item.setIdCode(code);
        item.setName(data.getName());
        item.setBrand(data.getBrand());
        item.setDescription(data.getDescription());
        item.setCostPrice(data.getCostPrice());
        item.setSellPrice(data.getSellPrice());
        item.setStock(data.getStock());
        item.setMinStock(data.getMinStock());

        // Como o item já tem id, o Hibernate faz um UPDATE em vez de um INSERT
        return repoI.save(item);
    }

    public void delete(Long id) {
        Item item = findById(id);
        repoI.delete(item);
    }

    // Avisos de estoque para a Home: só itens que bateram o mínimo ou zeraram
    public List<StockAlertResponse> getStockAlerts() {
        return repoI.findLowStock()
                .stream()
                .map(this::toStockAlert)
                .toList();
    }

    private StockAlertResponse toStockAlert(Item item) {
        // Zerado é checado primeiro, porque 0 também é <= ao mínimo
        if (item.getStock() == 0) {
            return new StockAlertResponse(
                    item.getId(), item.getIdCode(), item.getName(),
                    item.getStock(), item.getMinStock(),
                    StockAlertLevel.OUT_OF_STOCK,
                    item.getName() + " acabou! Estoque zerado."
            );
        }
        return new StockAlertResponse(
                item.getId(), item.getIdCode(), item.getName(),
                item.getStock(), item.getMinStock(),
                StockAlertLevel.LOW_STOCK,
                item.getName() + " atingiu o estoque mínimo (" + item.getStock() + " de " + item.getMinStock() + ")"
        );
    }

    private String normalizeIdCode(String idCode) {
        return idCode.trim().toUpperCase();
    }
}
