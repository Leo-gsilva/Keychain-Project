package br.com.senac.backend.models;

import lombok.Getter;

public enum SaleStatus {
    COMPLETED("Concluída"),
    CANCELED("Cancelada");

    @Getter
    private final String description;

    SaleStatus(String description) {
        this.description = description;
    }
}
