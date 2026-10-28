package br.com.senac.backend.models.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

// O que o front recebe para cada anexo (sem os bytes; o arquivo é baixado pela rota de download)
@Data
@AllArgsConstructor
public class AttachmentResponse {
    private Long id;
    private String fileName;
    private String contentType;
    private Long size;
    private LocalDateTime createdAt;
}
