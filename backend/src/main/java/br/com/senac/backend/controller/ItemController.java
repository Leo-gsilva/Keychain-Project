package br.com.senac.backend.controller;

import br.com.senac.backend.models.entities.Item;
import br.com.senac.backend.models.response.StockAlertResponse;
import br.com.senac.backend.service.ItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
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
@RequestMapping("/items")
@RequiredArgsConstructor
@Tag(name = "Itens", description = "Cadastro de itens do estoque e avisos de estoque baixo. Qualquer usuário logado tem acesso.")
@PreAuthorize("isAuthenticated()")
public class ItemController {
    private final ItemService service;


    @Operation(summary = "Cadastrar item",
            description = "O `idCode` é padronizado antes de salvar (espaços removidos e tudo em maiúsculo): "
                    + "`\" ch-001 \"` vira `\"CH-001\"`. Não pode existir outro item com o mesmo código. "
                    + "O `id` é gerado pelo banco; se vier no JSON, é ignorado.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Item cadastrado"),
            @ApiResponse(responseCode = "400", description = "Campo obrigatório em branco, ou preço/estoque negativo", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "409", description = "Já existe um item com esse código", content = @Content)
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Item create(@Valid @RequestBody Item item) {
        return service.saveItem(item);
    }

    @Operation(summary = "Listar itens",
            description = "Devolve todos os itens. Filtros e buscas são feitos pelo front.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de itens (vazia se não houver nenhum)"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content)
    })
    @GetMapping
    public List<Item> findAll() {
        return service.findAll();
    }

    @Operation(summary = "Avisos de estoque",
            description = "Chamado pela Home. Devolve só os itens com problema, do menor estoque para o maior: "
                    + "`OUT_OF_STOCK` quando o estoque é 0, `LOW_STOCK` quando está igual ou abaixo do mínimo. "
                    + "Lista vazia = nenhum aviso.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de avisos",
                    content = @Content(examples = @ExampleObject(value = """
                            [
                              { "id": 3, "idCode": "CH-001", "name": "Gold 3", "stock": 0, "minStock": 5,
                                "level": "OUT_OF_STOCK", "message": "Gold 3 acabou! Estoque zerado." },
                              { "id": 7, "idCode": "CAD-20", "name": "Pado 20mm", "stock": 2, "minStock": 3,
                                "level": "LOW_STOCK", "message": "Pado 20mm atingiu o estoque mínimo (2 de 3)" }
                            ]"""))),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content)
    })
    @GetMapping("/alerts")
    public List<StockAlertResponse> getStockAlerts() {
        return service.getStockAlerts();
    }

    @Operation(summary = "Editar item",
            description = "Substitui todos os dados do item (todos os campos obrigatórios devem ser enviados). "
                    + "O código pode ser alterado, desde que não pertença a outro item.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Item atualizado"),
            @ApiResponse(responseCode = "400", description = "Campo obrigatório em branco, ou preço/estoque negativo", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Item não encontrado", content = @Content),
            @ApiResponse(responseCode = "409", description = "O código já pertence a outro item", content = @Content)
    })
    @PutMapping("/{id}")
    public Item update(@PathVariable Long id, @Valid @RequestBody Item data) {
        return service.update(id, data);
    }

    @Operation(summary = "Excluir item")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Item excluído"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Item não encontrado", content = @Content)
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
