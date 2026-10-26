package br.com.senac.backend.repository;

import br.com.senac.backend.models.entities.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
    boolean existsByIdCode(String idCode);
    Optional<Item> findByIdCode(String idCode);

    // Itens que bateram o estoque mínimo ou zeraram, do menor estoque pro maior
    @Query("SELECT i FROM Item i WHERE i.stock <= i.minStock ORDER BY i.stock ASC")
    List<Item> findLowStock();
}
