package br.com.senac.backend.models;

import lombok.Getter;

@Getter
public enum Role {
    ADMINISTRATOR("Administrator"), EMPLOYEE("Employee");
    private String role;

    Role(String role) {
        this.role = role;
    }

    @Override
    public String toString() {
        return this.role;
    }
}

