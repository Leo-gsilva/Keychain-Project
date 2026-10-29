package br.com.senac.backend.controller;

import br.com.senac.backend.models.request.ServiceRequest;
import br.com.senac.backend.models.request.ServiceStatusRequest;
import br.com.senac.backend.models.response.ServiceResponse;
import br.com.senac.backend.service.ServiceOrderService;
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
@RequestMapping("/services")
@RequiredArgsConstructor
@Tag(name = "Serviços", description = "Cadastro e acompanhamento dos serviços realizados. Qualquer usuário logado tem acesso.")
@PreAuthorize("isAuthenticated()")
public class ServiceOrderController {

    private final ServiceOrderService service;

    @Operation(summary = "Cadastrar serviço",
            description = "O serviço sempre nasce com status `PENDING` (o `status` do JSON é ignorado). "
                    + "O CPF/CNPJ do cliente é salvo só com números. "
                    + "Se o `location` for `ON_SITE`, o `address` é obrigatório. "
                    + "`items` (opcional) são as peças e materiais do estoque usados no serviço. Aqui só são registradas: saem do estoque quando o serviço for concluído. "
                    + "`scheduledAt` (opcional) é a previsão de atendimento.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Serviço cadastrado"),
            @ApiResponse(responseCode = "400", description = "Campo obrigatório em branco, telefone/CPF/CNPJ inválido, valor negativo ou endereço ausente em serviço no local", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Algum item não existe", content = @Content)
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceResponse create(@Valid @org.springframework.web.bind.annotation.RequestBody ServiceRequest data) {
        return service.saveService(data);
    }

    @Operation(summary = "Listar serviços",
            description = "Devolve todos os serviços. Filtros e buscas são feitos pelo front.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de serviços (vazia se não houver nenhum)"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content)
    })
    @GetMapping
    public List<ServiceResponse> findAll() {
        return service.findAll();
    }

    @Operation(summary = "Buscar serviço")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dados do serviço"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado", content = @Content)
    })
    @GetMapping("/{id}")
    public ServiceResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @Operation(summary = "Editar serviço",
            description = "Substitui todos os dados do serviço (todos os campos obrigatórios devem ser enviados). "
                    + "O status **não** muda por aqui, use `PATCH /services/{id}/status`. "
                    + "Sem `items` no JSON, as peças continuam as mesmas. Com `items` (mesmo `[]`), a lista substitui a anterior; "
                    + "se o serviço já estiver concluído, as peças antigas voltam ao estoque e as novas saem.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Serviço atualizado"),
            @ApiResponse(responseCode = "400", description = "Campo obrigatório em branco, telefone/CPF/CNPJ inválido, valor negativo ou endereço ausente em serviço no local", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Serviço ou item não encontrado", content = @Content),
            @ApiResponse(responseCode = "409", description = "Estoque insuficiente para algum item", content = @Content)
    })
    @PutMapping("/{id}")
    public ServiceResponse update(@PathVariable Long id, @Valid @org.springframework.web.bind.annotation.RequestBody ServiceRequest data) {
        return service.update(id, data);
    }

    @Operation(summary = "Alterar status do serviço",
            description = "Muda só o andamento do serviço: `PENDING`, `IN_PROGRESS`, `COMPLETED` ou `CANCELED`. "
                    + "Ao virar `COMPLETED`, as peças saem do estoque com o preço de custo do momento. Ao sair de `COMPLETED` (cancelar ou voltar pra execução/pendente), voltam ao estoque.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status atualizado"),
            @ApiResponse(responseCode = "400", description = "Status em branco ou inexistente", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Serviço ou item não encontrado", content = @Content),
            @ApiResponse(responseCode = "409", description = "Estoque insuficiente para concluir o serviço", content = @Content)
    })
    @PatchMapping("/{id}/status")
    public ServiceResponse updateStatus(@PathVariable Long id, @Valid @org.springframework.web.bind.annotation.RequestBody ServiceStatusRequest data) {
        return service.updateStatus(id, data.getStatus());
    }

    @Operation(summary = "Excluir serviço", description = "Se o serviço estava concluído, as peças voltam ao estoque.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Serviço excluído"),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado", content = @Content)
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}