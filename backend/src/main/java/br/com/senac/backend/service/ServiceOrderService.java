package br.com.senac.backend.service;

import br.com.senac.backend.models.ServiceLocation;
import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.entities.Item;
import br.com.senac.backend.models.entities.ServiceItem;
import br.com.senac.backend.models.entities.ServiceOrder;
import br.com.senac.backend.models.request.ServiceRequest;
import br.com.senac.backend.models.response.ServiceResponse;
import br.com.senac.backend.repository.ItemRepository;
import br.com.senac.backend.repository.ServiceAttachmentRepository;
import br.com.senac.backend.repository.ServiceOrderRepository;
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
public class ServiceOrderService {
    private final ServiceOrderRepository repoS;
    private final ServiceAttachmentRepository repoA;
    private final ItemRepository repoI;
    private final ServiceAttachmentService attachments;

    public ServiceOrderService(ServiceOrderRepository repoS, ServiceAttachmentRepository repoA,
                               ItemRepository repoI, ServiceAttachmentService attachments) {
        this.repoS = repoS;
        this.repoA = repoA;
        this.repoI = repoI;
        this.attachments = attachments;
    }

    @Transactional
    public ServiceResponse saveService(ServiceRequest data) {
        // Objeto novo: garante que é um cadastro (o id é gerado pelo banco)
        ServiceOrder order = new ServiceOrder();
        applyData(order, data);

        // Todo serviço nasce PENDING; o status só muda pelo endpoint de status
        order.setStatus(ServiceStatus.PENDING);
        order.setCreatedAt(LocalDateTime.now());

        // Só registra as peças; elas saem do estoque quando o serviço for concluído
        addLines(order, toQuantities(data.getItems()));

        return toResponse(repoS.save(order));
    }

    // readOnly: carrega as peças de cada serviço dentro da transação
    @Transactional(readOnly = true)
    public List<ServiceResponse> findAll() {
        return repoS.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ServiceResponse findById(Long id) {
        return toResponse(findEntityById(id));
    }

    @Transactional
    public ServiceResponse update(Long id, ServiceRequest data) {
        // Busca o serviço que já existe na base de dados
        ServiceOrder order = findEntityById(id);

        // O status não é alterado aqui, só pelo endpoint de status
        applyData(order, data);

        // Sem `items` no JSON: mantém as peças como estão. Com `items` (mesmo vazio): a lista substitui a anterior.
        // Serviço concluído já baixou o estoque: devolve as peças antigas e baixa as novas. Nos outros status só troca a lista
        if (data.getItems() != null) {
            Map<Long, Integer> quantities = toQuantities(data.getItems());
            if (holdsStock(order.getStatus())) {
                returnToStock(order);
                order.getItems().clear();
                takeFromStock(order, quantities);
            } else {
                order.getItems().clear();
                addLines(order, quantities);
            }
        }

        // Como o serviço já tem id, o Hibernate faz um UPDATE em vez de um INSERT
        return toResponse(repoS.save(order));
    }

    // Concluir tira as peças do estoque (com o preço de custo do momento);
    // sair de concluído (cancelar ou voltar pra execução/pendente) devolve.
    // Tudo numa transação: se um item não tiver estoque, nada é baixado e o status não muda
    @Transactional
    public ServiceResponse updateStatus(Long id, ServiceStatus status) {
        ServiceOrder order = findEntityById(id);
        ServiceStatus previous = order.getStatus();
        if (previous == status) {
            return toResponse(order);
        }

        if (holdsStock(previous) && !holdsStock(status)) {
            returnToStock(order);
        } else if (!holdsStock(previous) && holdsStock(status)) {
            Map<Long, Integer> quantities = new LinkedHashMap<>();
            order.getItems().forEach(line -> quantities.merge(line.getItemId(), line.getQuantity(), Integer::sum));
            order.getItems().clear();
            takeFromStock(order, quantities);
        }

        order.setStatus(status);
        order.setStatusChangedAt(LocalDateTime.now());
        return toResponse(repoS.save(order));
    }

    // Apaga os anexos antes, senão a chave estrangeira impede excluir o serviço.
    // Os arquivos no Storage só são apagados depois que o banco confirmar
    @Transactional
    public void delete(Long id) {
        ServiceOrder order = findEntityById(id);
        // Excluir um serviço concluído devolve as peças ao estoque
        if (holdsStock(order.getStatus())) {
            returnToStock(order);
        }
        List<String> paths = repoA.findStoragePathsByServiceId(id);
        repoA.deleteAllByServiceId(id);
        repoS.delete(order);
        attachments.deleteFilesAfterCommit(paths);
    }

    private ServiceOrder findEntityById(Long id) {
        return repoS.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + id));
    }

    // Copia os dados do request para a entidade (usado no cadastro e na edição)
    private void applyData(ServiceOrder order, ServiceRequest data) {
        // Atendimento no local do cliente precisa de endereço
        if (data.getLocation() == ServiceLocation.ON_SITE
                && (data.getAddress() == null || data.getAddress().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Address is mandatory for on-site services");
        }

        order.setClientName(data.getClientName());
        order.setClientPhone(data.getClientPhone());
        order.setClientCpfCnpj(normalizeDocument(data.getClientCpfCnpj()));
        order.setServiceType(data.getServiceType());
        order.setHiringDate(data.getHiringDate());
        order.setObservations(data.getObservations());
        order.setLocation(data.getLocation());
        order.setAddress(data.getAddress());
        order.setServiceValue(data.getServiceValue());
        order.setPaidValue(data.getPaidValue());
        order.setPaymentMethod(data.getPaymentMethod());
        order.setScheduledAt(data.getScheduledAt());
    }

    // Só serviço concluído está com as peças fora do estoque
    private boolean holdsStock(ServiceStatus status) {
        return status == ServiceStatus.COMPLETED;
    }

    // Junta linhas repetidas do mesmo item: [{1, 2}, {1, 3}] vira {1: 5}
    private Map<Long, Integer> toQuantities(List<ServiceRequest.ServiceItemRequest> lines) {
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        if (lines != null) {
            for (ServiceRequest.ServiceItemRequest line : lines) {
                quantities.merge(line.getItemId(), line.getQuantity(), Integer::sum);
            }
        }
        return quantities;
    }

    // Baixa do estoque e registra as linhas com o preço de custo atual
    private void takeFromStock(ServiceOrder order, Map<Long, Integer> quantities) {
        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
            Item item = findItem(entry.getKey());
            int quantity = entry.getValue();

            if (item.getStock() < quantity) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Insufficient stock for " + item.getName() + " (available: " + item.getStock() + ")");
            }
            item.setStock(item.getStock() - quantity);
            order.getItems().add(newLine(order, item, quantity));
        }
    }

    // Registra as linhas sem mexer no estoque (serviço ainda não concluído)
    private void addLines(ServiceOrder order, Map<Long, Integer> quantities) {
        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
            order.getItems().add(newLine(order, findItem(entry.getKey()), entry.getValue()));
        }
    }

    private void returnToStock(ServiceOrder order) {
        for (ServiceItem line : order.getItems()) {
            // Se o item foi excluído do estoque depois, não há para onde devolver
            repoI.findById(line.getItemId())
                    .ifPresent(item -> item.setStock(item.getStock() + line.getQuantity()));
        }
    }

    private Item findItem(Long id) {
        return repoI.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found: " + id));
    }

    private ServiceItem newLine(ServiceOrder order, Item item, int quantity) {
        BigDecimal totalCost = item.getCostPrice().multiply(BigDecimal.valueOf(quantity));
        return new ServiceItem(null, order, item.getId(), item.getIdCode(), item.getName(),
                quantity, item.getCostPrice(), totalCost);
    }

    private ServiceResponse toResponse(ServiceOrder order) {
        BigDecimal materialsCost = order.getItems().stream()
                .map(ServiceItem::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ServiceResponse(
                order.getId(), order.getClientName(), order.getClientPhone(),
                order.getClientCpfCnpj(), order.getServiceType(), order.getHiringDate(),
                order.getStatus(), order.getObservations(), order.getLocation(),
                order.getAddress(), order.getServiceValue(), order.getPaidValue(),
                order.getPaymentMethod(), order.getScheduledAt(), order.getCreatedAt(),
                order.getStatusChangedAt(), order.getItems(), materialsCost
        );
    }

    // Guarda CPF/CNPJ só com números, pra "123.456.789-09" e "12345678909" serem o mesmo
    private String normalizeDocument(String document) {
        if (document == null || document.isBlank()) {
            return null;
        }
        return document.replaceAll("\\D", "");
    }
}
