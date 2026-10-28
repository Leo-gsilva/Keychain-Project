package br.com.senac.backend.storage;

import java.util.Collection;

// Onde os arquivos dos anexos ficam guardados fora do banco.
// Hoje a implementação é o Supabase Storage; dá para trocar por disco local (VM) ou S3 sem mexer no resto.
public interface FileStorage {

    // false = não configurado: os anexos continuam sendo salvos no próprio banco
    boolean isEnabled();

    void save(String path, byte[] data, String contentType);

    byte[] read(String path);

    void delete(Collection<String> paths);
}
