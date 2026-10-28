package br.com.senac.backend.service;

import br.com.senac.backend.models.entities.ServiceOrder;
import br.com.senac.backend.repository.ServiceOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ServiceOrderService {

    private final ServiceOrderRepository repo;

    @Transactional
    public ServiceOrder save(ServiceOrder serviceOrder) {
        // Garante a criação de um novo registro no banco
        serviceOrder.setId(null);

        // Se o valor pago não for informado no JSON, garante o padrão 0.00
        if (serviceOrder.getPaidValue() == null) {
            serviceOrder.setPaidValue(BigDecimal.ZERO);
        }

        // Salva todos os campos mapeados na entidade ServiceOrder de uma só vez
        return repo.save(serviceOrder);
    }
}