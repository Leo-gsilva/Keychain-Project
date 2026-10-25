package br.com.senac.backend.utils;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public final class BCrypt {

    private static final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    private BCrypt() {
    }

    // Criptografa a senha para salvar no banco
    public static String hash(String password) {
        return encoder.encode(password);
    }

    // Compara a senha digitada no login com o hash salvo no banco
    public static boolean checkPassword(String rawPassword, String encodedPassword) {
        return encoder.matches(rawPassword, encodedPassword);
    }
}