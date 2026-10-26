package br.com.senac.backend.models;

public enum Category {

    CHAVES_VIRGENS("Chaves virgens"),
    CHAVES_AUTOMOTIVAS("Chaves automotivas"),
    CONTROLES_REMOTOS("Controles remotos"),
    FECHADURAS("Fechaduras"),
    CILINDROS_MIOLOS("Cilindros e miolos"),
    CADEADOS("Cadeados"),
    PECAS_REPOSICAO("Peças de reposição"),
    BATERIAS_PILHAS("Baterias e pilhas"),
    ACESSORIOS("Acessórios"),
    FERRAMENTAS_INSUMOS("Ferramentas e insumos"),
    OUTROS("Outros");

    private final String description;

    Category(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return this.description;
    }
}