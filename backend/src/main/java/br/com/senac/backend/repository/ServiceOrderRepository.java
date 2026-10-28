package br.com.senac.backend.repository;

<<<<<<< Updated upstream
import br.com.senac.backend.models.ServiceStatus;
=======
>>>>>>> Stashed changes
import br.com.senac.backend.models.entities.ServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

<<<<<<< Updated upstream
import java.util.List;

@Repository
public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByStatus(ServiceStatus status);
}
=======
@Repository
public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
}
>>>>>>> Stashed changes
