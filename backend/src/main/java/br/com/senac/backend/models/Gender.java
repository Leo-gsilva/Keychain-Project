package br.com.senac.backend.models;


import lombok.Getter;

@Getter
public enum Gender {MASCULINE("Masculine"), FEMININE("Feminine"), OTHERS("Others");

    private String description;

    Gender(String description) {
        this.description = description;
    }
    @Override
    public String toString() {
        return this.description;
    }
}
