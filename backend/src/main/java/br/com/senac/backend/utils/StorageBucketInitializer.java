package br.com.senac.backend.utils;

import br.com.senac.backend.storage.SupabaseFileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Ao subir a API, cria o bucket dos anexos no Supabase Storage se ele ainda não existir.
// Se faltar configuração ou o Supabase estiver fora, só avisa no log: a API sobe mesmo assim.
@Slf4j
@Component
@RequiredArgsConstructor
public class StorageBucketInitializer implements CommandLineRunner {

    private final SupabaseFileStorage storage;

    @Override
    public void run(String... args) {
        if (!storage.isEnabled()) {
            log.warn("Supabase Storage não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env). "
                    + "Os anexos serão salvos no próprio banco.");
            return;
        }
        try {
            boolean created = storage.createBucketIfMissing();
            log.info(created
                    ? "Supabase Storage: bucket '{}' criado (privado, até 20 MB por arquivo)."
                    : "Supabase Storage: bucket '{}' já existe.", SupabaseFileStorage.BUCKET);
        } catch (Exception e) {
            log.warn("Supabase Storage: não foi possível verificar/criar o bucket '{}': {}",
                    SupabaseFileStorage.BUCKET, e.getMessage());
        }
    }
}
