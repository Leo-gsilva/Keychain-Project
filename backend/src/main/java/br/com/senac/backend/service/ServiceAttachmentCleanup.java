package br.com.senac.backend.service;

import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.repository.ServiceAttachmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// Libera espaço apagando anexos antigos de serviços que já terminaram (no banco e no Storage).
// Serviços pendentes ou em andamento nunca perdem anexos.
@Slf4j
@Component
@RequiredArgsConstructor
public class ServiceAttachmentCleanup {
    private final ServiceAttachmentRepository repoA;
    private final ServiceAttachmentService attachments;

    public static final int RETENTION_DAYS = 90;
    private static final List<ServiceStatus> FINISHED = List.of(ServiceStatus.COMPLETED, ServiceStatus.CANCELED);

    // Todo dia 1º do mês, às 3h da manhã (horário de Brasília)
    @Scheduled(cron = "0 0 3 1 * *", zone = "America/Sao_Paulo")
    @Transactional
    public void deleteOldAttachments() {
        // A ServiceOrder não guarda a data de conclusão, então o prazo conta a partir do envio do anexo
        LocalDateTime limit = LocalDateTime.now().minusDays(RETENTION_DAYS);
        List<String> paths = repoA.findOldStoragePathsByServiceStatus(limit, FINISHED);
        int deleted = repoA.deleteOldByServiceStatus(limit, FINISHED);
        attachments.deleteFilesAfterCommit(paths);
        log.info("Limpeza de anexos: {} anexo(s) de serviços concluídos/cancelados enviados antes de {} foram apagados",
                deleted, limit.toLocalDate());
    }
}
