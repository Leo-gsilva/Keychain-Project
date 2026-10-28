package br.com.senac.backend.repository;

import br.com.senac.backend.models.entities.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    // Mais recentes primeiro
    List<Sale> findAllByOrderByCreatedAtDesc();
}
