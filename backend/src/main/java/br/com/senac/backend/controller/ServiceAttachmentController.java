package br.com.senac.backend.controller;

import br.com.senac.backend.models.entities.ServiceAttachment;
import br.com.senac.backend.models.response.AttachmentResponse;
import br.com.senac.backend.service.ServiceAttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/services/{serviceId}/attachments")
@RequiredArgsConstructor
@Tag(name = "Anexos de serviço", description = "Fotos e documentos de uma ordem de serviço. Qualquer usuário logado tem acesso.")
@PreAuthorize("isAuthenticated()")
public class ServiceAttachmentController {
    private final ServiceAttachmentService service;


    @Operation(summary = "Enviar anexos",
            description = "Envia um ou mais arquivos no campo `files` (`multipart/form-data`). "
                    + "Aceita jpg, jpeg, png, webp, heic, pdf, doc, docx, xls, xlsx e txt, até 20 MB cada "
                    + "e no máximo 20 anexos por serviço. Se um arquivo for inválido, nenhum é salvo.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Anexos salvos"),
            @ApiResponse(responseCode = "400", description = "Nenhum arquivo, arquivo vazio, tipo não permitido, maior que 20 MB ou limite de anexos atingido", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado", content = @Content),
            @ApiResponse(responseCode = "413", description = "Envio maior que o limite do servidor", content = @Content)
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public List<AttachmentResponse> upload(@PathVariable Long serviceId,
                                           @RequestPart("files") List<MultipartFile> files) {
        return service.upload(serviceId, files);
    }

    @Operation(summary = "Listar anexos",
            description = "Devolve nome, tipo, tamanho e data de cada anexo, sem o conteúdo do arquivo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de anexos (vazia se não houver nenhum)"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado", content = @Content)
    })
    @GetMapping
    public List<AttachmentResponse> findAll(@PathVariable Long serviceId) {
        return service.findAll(serviceId);
    }

    @Operation(summary = "Baixar anexo", description = "Devolve o arquivo com o nome e a extensão originais.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Arquivo"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Anexo não encontrado nesse serviço", content = @Content)
    })
    @GetMapping("/{attachmentId}")
    public ResponseEntity<byte[]> download(@PathVariable Long serviceId, @PathVariable Long attachmentId) {
        ServiceAttachment a = service.findById(serviceId, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(a.getFileName(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(service.readContent(a));
    }

    @Operation(summary = "Excluir anexo")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Anexo excluído"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Anexo não encontrado nesse serviço", content = @Content)
    })
    @DeleteMapping("/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long serviceId, @PathVariable Long attachmentId) {
        service.delete(serviceId, attachmentId);
    }
}
