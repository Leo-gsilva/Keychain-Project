package br.com.senac.backend.service;

import br.com.senac.backend.models.entities.ServiceAttachment;
import br.com.senac.backend.models.entities.ServiceOrder;
import br.com.senac.backend.models.response.AttachmentResponse;
import br.com.senac.backend.repository.ServiceAttachmentRepository;
import br.com.senac.backend.repository.ServiceOrderRepository;
import br.com.senac.backend.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceAttachmentService {
    private final ServiceAttachmentRepository repoA;
    private final ServiceOrderRepository repoS;
    private final FileStorage storage;

    // Fotos e documentos aceitos
    public static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "heic",
            "pdf", "doc", "docx", "xls", "xlsx", "txt"
    );
    public static final long MAX_FILE_SIZE = 20L * 1024 * 1024;  // 20 MB por arquivo
    public static final int MAX_FILES_PER_SERVICE = 20;

    // Tudo numa transação: se um arquivo for inválido, nenhum é salvo
    @Transactional
    public List<AttachmentResponse> upload(Long serviceId, List<MultipartFile> files) {
        ServiceOrder order = repoS.findById(serviceId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + serviceId));

        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file sent");
        }
        if (repoA.countByServiceOrderId(serviceId) + files.size() > MAX_FILES_PER_SERVICE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A service can have at most " + MAX_FILES_PER_SERVICE + " attachments");
        }

        // Valida todos antes de enviar qualquer um para o Storage
        List<String> names = new ArrayList<>();
        for (MultipartFile file : files) {
            String fileName = cleanFileName(file.getOriginalFilename());
            validate(file, fileName);
            names.add(fileName);
        }

        // Se a transação falhar depois de enviar arquivos ao Storage, apaga esses arquivos
        List<String> uploaded = new ArrayList<>();
        afterRollback(uploaded);

        List<AttachmentResponse> saved = new ArrayList<>();
        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            String fileName = names.get(i);
            // O tipo vem da extensão, não do que o navegador diz
            String contentType = MediaTypeFactory.getMediaType(fileName)
                    .orElse(MediaType.APPLICATION_OCTET_STREAM).toString();
            byte[] bytes = readBytes(file);

            ServiceAttachment attachment = new ServiceAttachment();
            attachment.setServiceOrder(order);
            attachment.setFileName(fileName);
            attachment.setContentType(contentType);
            attachment.setSize(file.getSize());
            attachment.setCreatedAt(LocalDateTime.now());

            if (storage.isEnabled()) {
                // No Storage o arquivo ganha um nome único; o nome original fica no banco
                String path = "services/" + serviceId + "/" + UUID.randomUUID() + "." + extension(fileName);
                try {
                    storage.save(path, bytes, contentType);
                } catch (Exception e) {
                    log.error("Falha ao enviar '{}' para o Storage: {}", fileName, e.getMessage());
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not store file: " + fileName);
                }
                uploaded.add(path);
                attachment.setStoragePath(path);
            } else {
                attachment.setData(bytes);
            }

            saved.add(toResponse(repoA.save(attachment)));
        }
        return saved;
    }

    public List<AttachmentResponse> findAll(Long serviceId) {
        if (!repoS.existsById(serviceId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + serviceId);
        }
        return repoA.findInfoByServiceId(serviceId);
    }

    public ServiceAttachment findById(Long serviceId, Long attachmentId) {
        // Confere se o anexo é mesmo desse serviço
        return repoA.findByIdAndServiceOrderId(attachmentId, serviceId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found: " + attachmentId));
    }

    // Conteúdo do arquivo, venha do Storage ou do banco
    public byte[] readContent(ServiceAttachment attachment) {
        if (attachment.getStoragePath() == null) {
            return attachment.getData();
        }
        if (!storage.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "File storage is not configured");
        }
        try {
            return storage.read(attachment.getStoragePath());
        } catch (Exception e) {
            log.error("Falha ao ler '{}' do Storage: {}", attachment.getStoragePath(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not read file: " + attachment.getFileName());
        }
    }

    @Transactional
    public void delete(Long serviceId, Long attachmentId) {
        ServiceAttachment attachment = findById(serviceId, attachmentId);
        repoA.delete(attachment);
        if (attachment.getStoragePath() != null) {
            deleteFilesAfterCommit(List.of(attachment.getStoragePath()));
        }
    }

    // Apaga os arquivos do Storage só depois que o banco confirmar a exclusão.
    // Usado aqui, ao excluir o serviço e na limpeza automática
    public void deleteFilesAfterCommit(Collection<String> paths) {
        if (paths.isEmpty() || !storage.isEnabled()) return;
        List<String> copy = List.copyOf(paths);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    storage.delete(copy);
                } catch (Exception e) {
                    // O registro já saiu do banco; o arquivo fica órfão no bucket, mas nada quebra
                    log.warn("Falha ao apagar {} arquivo(s) do Storage: {}", copy.size(), e.getMessage());
                }
            }
        });
    }

    private void afterRollback(List<String> uploadedPaths) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED && !uploadedPaths.isEmpty()) {
                    try {
                        storage.delete(uploadedPaths);
                    } catch (Exception e) {
                        log.warn("Falha ao desfazer envio de {} arquivo(s) ao Storage: {}", uploadedPaths.size(), e.getMessage());
                    }
                }
            }
        });
    }

    private void validate(MultipartFile file, String fileName) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty: " + fileName);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is larger than 20 MB: " + fileName);
        }
        if (!ALLOWED_EXTENSIONS.contains(extension(fileName))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "File type not allowed: " + fileName + ". Allowed: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
    }

    // Tira caminhos que alguns navegadores mandam junto ("C:\fotos\porta.jpg" vira "porta.jpg")
    private String cleanFileName(String original) {
        if (original == null || original.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File name is missing");
        }
        String name = original.replace("\\", "/");
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File name is missing");
        }
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    private String extension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file: " + file.getOriginalFilename());
        }
    }

    private AttachmentResponse toResponse(ServiceAttachment a) {
        return new AttachmentResponse(a.getId(), a.getFileName(), a.getContentType(), a.getSize(), a.getCreatedAt());
    }
}
