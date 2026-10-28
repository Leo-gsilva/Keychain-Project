package br.com.senac.backend.models;

import lombok.Getter;

public enum PaymentMethod {
    CASH("Cash"),
    PIX("Pix"),
    CREDIT_CARD("Credit Card"),
    DEBIT_CARD("Debit Card"),
    TO_BE_DEFINED("To Be Defined");

    @Getter
    private final String description;

    PaymentMethod(String description) {
        this.description = description;
    }
}