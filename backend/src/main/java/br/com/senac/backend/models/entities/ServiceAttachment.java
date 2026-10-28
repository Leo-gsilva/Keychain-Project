package br.com.senac.backend.models.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

// Arquivo anexado a uma ordem de serviço (foto ou documento)
@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tb_service_attachments")
public class ServiceAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOrder serviceOrder;

    // Nome original, com extensão: "porta-frente.jpg", "orcamento.pdf"
    @Column(nullable = false)
    private String fileName;

    // Tipo do arquivo: "image/jpeg", "application/pdf"...
    @Column(nullable = false)
    private String contentType;

    // Tamanho em bytes
    @Column(nullable = false)
    private Long size;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // Caminho do arquivo no Supabase Storage ("services/18/3f2a...e1.pdf").
    // Nulo = o arquivo está no próprio banco, na coluna "data" (Storage não configurado no envio)
    private String storagePath;

    // Só usado quando o Storage não está configurado. Sem @Lob: no PostgreSQL vira "bytea"
    @ToString.Exclude
    private byte[] data;
}
