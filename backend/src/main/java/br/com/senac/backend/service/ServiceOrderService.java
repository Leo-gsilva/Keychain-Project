package br.com.senac.backend.service;

import br.com.senac.backend.models.ServiceLocation;
import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.entities.ServiceOrder;
import br.com.senac.backend.models.request.ServiceRequest;
import br.com.senac.backend.models.response.ServiceResponse;
import br.com.senac.backend.repository.ServiceOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;

@Service
public class ServiceOrderService {
    private final ServiceOrderRepository repoS;

    public ServiceOrderService(ServiceOrderRepository repoS) {
        this.repoS = repoS;
    }

    public ServiceResponse saveService(ServiceRequest data) {
        // Objeto novo: garante que é um cadastro (o id é gerado pelo banco)
        ServiceOrder order = new ServiceOrder();
        applyData(order, data);

        // Todo serviço nasce PENDING; o status só muda pelo endpoint de status
        order.setStatus(ServiceStatus.PENDING);

        return toResponse(repoS.save(order));
    }

    // Save with image

    @Transactional
    public ServiceResponse saveWithImageBase64(ServiceRequest data) {
        ServiceOrder order = new ServiceOrder();
        applyData(order, data);
        order.setStatus(ServiceStatus.PENDING);

        if (data.getImageBase64() != null && !data.getImageBase64().isBlank()) {
            String base64Data = data.getImageBase64();

            // Se a string contiver o prefixo "data:image/png;base64,", removemos antes de decodificar
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }

            // Converte a String de texto Base64 em um array de bytes
            byte[] decodedBytes = Base64.getDecoder().decode(base64Data);

            //Finaliza atribuindo os bytes à entidade e grava no BD
            order.setImageData(decodedBytes);
        }

        return toResponse(repoS.save(order));
    }

    public List<ServiceResponse> findAll() {
        return repoS.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ServiceResponse findById(Long id) {
        return toResponse(findEntityById(id));
    }

    public ServiceResponse update(Long id, ServiceRequest data) {
        // Busca o serviço que já existe na base de dados
        ServiceOrder order = findEntityById(id);

        // O status não é alterado aqui, só pelo endpoint de status
        applyData(order, data);

        // Como o serviço já tem id, o Hibernate faz um UPDATE em vez de um INSERT
        return toResponse(repoS.save(order));
    }

    public ServiceResponse updateStatus(Long id, ServiceStatus status) {
        ServiceOrder order = findEntityById(id);
        order.setStatus(status);
        return toResponse(repoS.save(order));
    }

    public void delete(Long id) {
        ServiceOrder order = findEntityById(id);
        repoS.delete(order);
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
    }

    private ServiceResponse toResponse(ServiceOrder order) {
        return new ServiceResponse(
                order.getId(), order.getClientName(), order.getClientPhone(),
                order.getClientCpfCnpj(), order.getServiceType(), order.getHiringDate(),
                order.getStatus(), order.getObservations(), order.getLocation(),
                order.getAddress(), order.getServiceValue(), order.getPaidValue(),
                order.getPaymentMethod()
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
