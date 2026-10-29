package br.com.senac.backend.controller;

import br.com.senac.backend.models.response.ActivityResponse;
import br.com.senac.backend.models.response.MetricsResponse;
import br.com.senac.backend.service.MetricsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/metrics")
@RequiredArgsConstructor
@Tag(name = "Métricas", description = "Indicadores financeiros e atividade recente. Só administrador.")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class MetricsController {
    private final MetricsService service;

    @Operation(summary = "Resumo do período",
            description = "Datas no formato `yyyy-MM-dd`, inclusivas nas duas pontas. Sem datas, usa do dia 1 do mês atual até hoje. "
                    + "Serviços contam pela `hiringDate`; vendas pela data de criação. "
                    + "**Faturamento total** = serviços concluídos (`serviceValue`) + vendas concluídas (`total`). "
                    + "**Despesas com peças e materiais** = quantidade x preço de custo dos itens do estoque usados em serviços concluídos e vendas concluídas "
                    + "(custo congelado no momento do uso/venda). "
                    + "**Lucro estimado** = faturamento total - despesas com peças e materiais.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Métricas do período"),
            @ApiResponse(responseCode = "400", description = "Data em formato inválido ou início depois do fim", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "403", description = "Usuário não é administrador", content = @Content)
    })
    @GetMapping
    public MetricsResponse summary(
            @Parameter(example = "2026-10-01") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @Parameter(example = "2026-10-31") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return service.summary(start, end);
    }

    @Operation(summary = "Últimas movimentações",
            description = "Serviços cadastrados, mudanças de status de serviço, vendas registradas e vendas canceladas, "
                    + "do mais recente pro mais antigo. Mudança de status mostra só a última de cada serviço. "
                    + "Serviços cadastrados antes desta versão não têm data e não aparecem.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de acontecimentos"),
            @ApiResponse(responseCode = "400", description = "Limite fora de 1 a 50", content = @Content),
            @ApiResponse(responseCode = "401", description = "Usuário não está logado", content = @Content),
            @ApiResponse(responseCode = "403", description = "Usuário não é administrador", content = @Content)
    })
    @GetMapping("/activity")
    public List<ActivityResponse> recentActivity(@RequestParam(defaultValue = "10") int limit) {
        return service.recentActivity(limit);
    }
}
