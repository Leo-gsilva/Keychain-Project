package br.com.senac.backend.controller;

import br.com.senac.backend.models.entities.Sale;
import br.com.senac.backend.models.request.SaleRequest;
import br.com.senac.backend.service.SaleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sales")
@RequiredArgsConstructor
@Tag(name = "Vendas", description = "Vendas de balcão. Finalizar baixa o estoque; cancelar devolve. Qualquer usuário logado tem acesso.")
@PreAuthorize("isAuthenticated()")
public class SaleController {
    private final SaleService service;


    @Operation(summary = "Registrar venda",
            description = "Precisa de pelo menos 1 item. O preço de cada item vem do `sellPrice` do estoque (não do JSON) "
                    + "e o vendedor é o usuário do token. Itens repetidos são somados. "
                    + "`installments` só é usado no `CREDIT_CARD`; nos outros vira 1. "
                    + "Cliente, desconto e observações são opcionais.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Venda registrada e estoque baixado"),
            @ApiResponse(responseCode = "400", description = "Sem itens, quantidade < 1, sem forma de pagamento, ou desconto maior que o subtotal", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Algum item não existe", content = @Content),
            @ApiResponse(responseCode = "409", description = "Estoque insuficiente para algum item", content = @Content)
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Sale create(@Valid @RequestBody SaleRequest req, @RequestAttribute("account_id") Integer accountId) {
        return service.create(req, accountId);
    }

    @Operation(summary = "Listar vendas", description = "Todas as vendas, das mais recentes para as mais antigas.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de vendas"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content)
    })
    @GetMapping
    public List<Sale> findAll() {
        return service.findAll();
    }

    @Operation(summary = "Ver venda")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dados da venda"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Venda não encontrada", content = @Content)
    })
    @GetMapping("/{id}")
    public Sale findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @Operation(summary = "Cancelar venda",
            description = "Venda concluída não é editada, só cancelada. Os itens voltam para o estoque.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Venda cancelada e estoque devolvido"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Venda não encontrada", content = @Content),
            @ApiResponse(responseCode = "409", description = "A venda já estava cancelada", content = @Content)
    })
    @PatchMapping("/{id}/cancel")
    public Sale cancel(@PathVariable Long id) {
        return service.cancel(id);
    }
}
