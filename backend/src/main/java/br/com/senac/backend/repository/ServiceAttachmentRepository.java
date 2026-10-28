package br.com.senac.backend.repository;

import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.entities.ServiceAttachment;
import br.com.senac.backend.models.response.AttachmentResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceAttachmentRepository extends JpaRepository<ServiceAttachment, Long> {

    // Só os dados do arquivo, sem carregar os bytes (a listagem fica leve)
    @Query("SELECT new br.com.senac.backend.models.response.AttachmentResponse(a.id, a.fileName, a.contentType, a.size, a.createdAt) "
            + "FROM ServiceAttachment a WHERE a.serviceOrder.id = :serviceId ORDER BY a.createdAt ASC, a.id ASC")
    List<AttachmentResponse> findInfoByServiceId(@Param("serviceId") Long serviceId);

    Optional<ServiceAttachment> findByIdAndServiceOrderId(Long id, Long serviceId);

    long countByServiceOrderId(Long serviceId);

    // Usado ao excluir o serviço: apaga os anexos direto no banco, sem carregar os arquivos
    @Modifying
    @Query("DELETE FROM ServiceAttachment a WHERE a.serviceOrder.id = :serviceId")
    void deleteAllByServiceId(@Param("serviceId") Long serviceId);

    // Caminhos no Storage dos anexos de um serviço (para apagar os arquivos junto com o serviço)
    @Query("SELECT a.storagePath FROM ServiceAttachment a WHERE a.serviceOrder.id = :serviceId AND a.storagePath IS NOT NULL")
    List<String> findStoragePathsByServiceId(@Param("serviceId") Long serviceId);

    // Caminhos no Storage dos anexos que a limpeza automática vai apagar (mesma regra do delete abaixo)
    @Query("SELECT a.storagePath FROM ServiceAttachment a WHERE a.createdAt < :limit AND a.storagePath IS NOT NULL "
            + "AND a.serviceOrder.id IN (SELECT s.id FROM ServiceOrder s WHERE s.status IN :statuses)")
    List<String> findOldStoragePathsByServiceStatus(@Param("limit") LocalDateTime limit,
                                                    @Param("statuses") Collection<ServiceStatus> statuses);

    // Limpeza automática: anexos antigos de serviços com um dos status informados. Devolve quantos apagou
    @Modifying
    @Query("DELETE FROM ServiceAttachment a WHERE a.createdAt < :limit "
            + "AND a.serviceOrder.id IN (SELECT s.id FROM ServiceOrder s WHERE s.status IN :statuses)")
    int deleteOldByServiceStatus(@Param("limit") LocalDateTime limit,
                                 @Param("statuses") Collection<ServiceStatus> statuses);
}
