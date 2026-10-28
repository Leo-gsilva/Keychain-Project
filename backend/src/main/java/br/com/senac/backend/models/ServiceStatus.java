package br.com.senac.backend.models;

import lombok.Getter;

public enum ServiceStatus {
    PENDING("Pending"),
    IN_PROGRESS("In Progress"),
    COMPLETED("Completed"),
    CANCELED("Canceled");

    @Getter
    private final String description;

    ServiceStatus(String description) {
        this.description = description;
    }
}