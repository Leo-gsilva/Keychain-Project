package br.com.senac.backend.models;

import lombok.Getter;

public enum ServiceLocation {
    STORE("Store / Workshop"),
    ON_SITE("On-site Service");

    @Getter
    private final String description;

    ServiceLocation(String description) {
        this.description = description;
    }
}