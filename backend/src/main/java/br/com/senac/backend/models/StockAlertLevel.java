package br.com.senac.backend.models;

public enum StockAlertLevel {

    LOW_STOCK("Estoque mínimo"),
    OUT_OF_STOCK("Sem estoque");

    private final String description;

    StockAlertLevel(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return this.description;
    }
}
