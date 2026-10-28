package br.com.senac.backend.repository;

import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.entities.ServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByStatus(ServiceStatus status);
}