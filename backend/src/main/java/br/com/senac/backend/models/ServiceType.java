package br.com.senac.backend.models;

import lombok.Getter;

public enum ServiceType {
    KEY_COPY("Cópia de chaves"),
    KEY_MAKING("Confecção de chaves"),
    UNLOCK_DOOR_VEHICLE_SAFE("Abertura de portas, veículos ou cofres"),
    REPLACE_INSTALL_LOCK_CYLINDER("Troca ou instalação de fechaduras e cilindros"),
    LOCK_REPAIR("Conserto de fechaduras"),
    AUTOMOTIVE_KEY_PROGRAMMING("Cópia ou programação de chaves automotivas"),
    DIGITAL_LOCK_INSTALLATION_MAINTENANCE("Abertura de cofres, Instalação e Manutenção de fechaduras Digitais"),
    OTHER("Outro");

    @Getter
    private final String description;

    ServiceType(String description) {
        this.description = description;
    }
}