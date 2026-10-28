package br.com.senac.backend.utils;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Liga as tarefas agendadas (@Scheduled), como a limpeza mensal de anexos
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
