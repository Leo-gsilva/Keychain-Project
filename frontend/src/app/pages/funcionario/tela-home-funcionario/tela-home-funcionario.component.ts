import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconeComponent } from '../../../components/icone/icone.component';
import { AlertaEstoque, ItemService } from '../../../services/item.service';
import { Servico, ServicoService } from '../../../services/servico.service';
import { SessionService } from '../../../services/session.service';
import {
  dataBr,
  dataIso,
  numeroServico,
  ordenarAlertas,
  servicosEmAberto,
  previsaoCurta,
  previsaoExtenso,
  primeiroNome
} from '../../../utils/home';
import { STATUS_SERVICO, TIPOS_SERVICO } from '../../../utils/servico-rotulos';

const LIMITE_SERVICOS = 8;
const LIMITE_ALERTAS = 3;

/**
 * Home do funcionário: atalhos para Estoque e Serviços, serviços para trabalhar,
 * materiais abaixo do mínimo e o próximo atendimento externo.
 * Não chama /metrics (exclusivo do administrador).
 */
@Component({
  selector: 'app-tela-home-funcionario',
  imports: [RouterLink, IconeComponent],
  templateUrl: './tela-home-funcionario.component.html',
  styleUrl: './tela-home-funcionario.component.scss'
})
export class TelaHomeFuncionarioComponent implements OnInit {
  private readonly servicosService = inject(ServicoService);
  private readonly itens = inject(ItemService);
  private readonly session = inject(SessionService);

  readonly nome = computed(() => primeiroNome(this.session.user()?.name));
  readonly hoje = dataBr(dataIso(new Date()));

  // ---------- Serviços para trabalhar (GET /services) ----------
  readonly servicos = signal<Servico[]>([]);
  readonly carregandoServicos = signal(true);
  readonly erroServicos = signal<string | null>(null);

  readonly servicosVisiveis = computed(() => this.servicos().slice(0, LIMITE_SERVICOS));
  readonly servicosOcultos = computed(() => Math.max(0, this.servicos().length - LIMITE_SERVICOS));

// Seleciona o primeiro serviço em aberto com atendimento no endereço do cliente.

  readonly proximoExterno = computed(() => this.servicos().find((s) => s.location === 'ON_SITE') ?? null);

  // ---------- Materiais abaixo do mínimo (GET /items/alerts) ----------
  readonly alertas = signal<AlertaEstoque[]>([]);
  readonly carregandoAlertas = signal(true);
  readonly erroAlertas = signal<string | null>(null);

  readonly alertasVisiveis = computed(() => this.alertas().slice(0, LIMITE_ALERTAS));
  readonly alertasOcultos = computed(() => Math.max(0, this.alertas().length - LIMITE_ALERTAS));

  ngOnInit(): void {
    this.servicosService.listar().subscribe({
      next: (lista) => {
        this.servicos.set(servicosEmAberto(lista));
        this.carregandoServicos.set(false);
      },
      error: () => {
        this.erroServicos.set('Não foi possível carregar os serviços agora.');
        this.carregandoServicos.set(false);
      }
    });

    this.itens.alertas().subscribe({
      next: (lista) => {
        this.alertas.set(ordenarAlertas(lista));
        this.carregandoAlertas.set(false);
      },
      error: () => {
        this.erroAlertas.set('Não foi possível carregar os avisos de estoque agora.');
        this.carregandoAlertas.set(false);
      }
    });
  }

  // ---------- Regras de exibição ----------
  numero(id: number): string {
    return numeroServico(id);
  }

  nomeTipo(valor: string): string {
    return TIPOS_SERVICO.find((t) => t.valor === valor)?.nome ?? '—';
  }

  nomeStatus(valor: string): string {
    return STATUS_SERVICO.find((s) => s.valor === valor)?.nome ?? '—';
  }

  previsao(iso: string | null): string {
    return previsaoCurta(iso);
  }

  previsaoExtensa(iso: string | null): string {
    return previsaoExtenso(iso);
  }

  // Quantas unidades faltam para chegar ao mínimo
  repor(alerta: AlertaEstoque): number {
    return Math.max(0, alerta.minStock - alerta.stock);
  }
}
