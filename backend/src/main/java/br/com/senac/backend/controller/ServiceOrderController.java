package br.com.senac.backend.controller;

import br.com.senac.backend.models.entities.ServiceOrder;
import br.com.senac.backend.service.ServiceOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/service-orders")
@RequiredArgsConstructor
@Tag(name = "Services", description = "Cadastro e gestão de ordem de serviço ")
@PreAuthorize("isAuthenticated()")
public class ServiceOrderController {

    private final ServiceOrderService service;

    @Operation(summary = "Criação de ordem de serviço")
    @PostMapping
    public ResponseEntity<ServiceOrder> create(@RequestBody @Valid ServiceOrder serviceOrder) {
        ServiceOrder savedOrder = service.save(serviceOrder);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrder);
    }
}