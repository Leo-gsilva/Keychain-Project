package br.com.senac.backend.storage;

import br.com.senac.backend.service.ServiceAttachmentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Collection;
import java.util.Map;

// Arquivos no Supabase Storage (bucket privado), pela API HTTP do Supabase.
// Só fica ativo com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.
@Component
public class SupabaseFileStorage implements FileStorage {

    public static final String BUCKET = "service-attachments";

    private final RestClient client;

    public SupabaseFileStorage(@Value("${SUPABASE_URL:}") String url,
                               @Value("${SUPABASE_SERVICE_ROLE_KEY:}") String key) {
        if (url.isBlank() || key.isBlank()) {
            this.client = null;
            return;
        }
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(url.replaceAll("/+$", "") + "/storage/v1")
                .defaultHeader("apikey", key);
        // A "service_role" antiga é um JWT (começa com "eyJ") e também vai no Authorization.
        // A "secret key" nova (sb_secret_...) não é JWT: o Supabase pede só o header apikey.
        if (key.startsWith("eyJ")) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + key);
        }
        this.client = builder.build();
    }

    @Override
    public boolean isEnabled() {
        return client != null;
    }

    @Override
    public void save(String path, byte[] data, String contentType) {
        client.post().uri("/object/{bucket}/{path}", BUCKET, path)
                .contentType(MediaType.parseMediaType(contentType))
                .header("x-upsert", "false")
                .body(data)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public byte[] read(String path) {
        return client.get().uri("/object/authenticated/{bucket}/{path}", BUCKET, path)
                .retrieve()
                .body(byte[].class);
    }

    @Override
    public void delete(Collection<String> paths) {
        if (paths.isEmpty()) return;
        // Apaga vários de uma vez: DELETE /object/{bucket} com {"prefixes": [...]}
        client.method(HttpMethod.DELETE).uri("/object/{bucket}", BUCKET)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("prefixes", paths))
                .retrieve()
                .toBodilessEntity();
    }

    // ---------- Bucket (usado pelo StorageBucketInitializer ao subir a API) ----------

    // true = criou agora; false = já existia
    public boolean createBucketIfMissing() {
        try {
            client.get().uri("/bucket/{id}", BUCKET).retrieve().toBodilessEntity();
            return false;
        } catch (HttpClientErrorException e) {
            // O Supabase responde 400 ou 404 quando o bucket não existe; 401/403 é chave errada
            if (e.getStatusCode().value() != 400 && e.getStatusCode().value() != 404) {
                throw e;
            }
        }
        try {
            client.post().uri("/bucket")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "id", BUCKET,
                            "name", BUCKET,
                            "public", false,
                            "file_size_limit", ServiceAttachmentService.MAX_FILE_SIZE
                    ))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (HttpClientErrorException.Conflict e) {
            // Outra instância da API criou ao mesmo tempo
            return false;
        }
    }
}
