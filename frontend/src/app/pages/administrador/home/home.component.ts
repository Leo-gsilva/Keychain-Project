import {NgTemplateOutlet} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnInit, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {AlertaEstoque, ItemService} from '../../../services/item.service';
import {Atividade, MetricasResumo, MetricasService} from '../../../services/metricas.service';
import {Servico, ServicoService} from '../../../services/servico.service';
import {SessionService} from '../../../services/session.service';
import {numeroParaTexto} from '../../../utils/dinheiro';
import {TIPOS_SERVICO} from '../../../utils/servico-rotulos';

type Periodo = 'hoje' | '7dias' | 'mes';

const MAX_ORDENS = 6;
const MAX_ALERTAS = 5;
const MAX_ATIVIDADES = 3;

// Data local no formato AAAA-MM-DD (o que o backend espera)
function dataIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function diaMes(data: Date): string {
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function hora(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/** Texto e ícone de uma linha de "Últimas movimentações". */
interface Movimentacao {
  chave: string;
  icone: 'cadastro' | 'concluido' | 'execucao' | 'aguardando' | 'cancelado' | 'venda';
  quando: string;
  titulo: string;
  texto: string;
}

@Component({
  selector: 'app-home-administrador',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeAdministradorComponent implements OnInit {
  private readonly metricasApi = inject(MetricasService);
  private readonly servicosApi = inject(ServicoService);
  private readonly itensApi = inject(ItemService);
  private readonly session = inject(SessionService);

  readonly primeiroNome = computed(() => this.session.user()?.name?.split(' ')[0] ?? '');

  // ---------- Período dos indicadores ----------
  readonly periodo = signal<Periodo>('hoje');
  private readonly hoje = new Date();

  readonly opcoesPeriodo: { valor: Periodo; nome: string }[] = [
    {valor: 'hoje', nome: `Hoje, ${diaMes(this.hoje)}`},
    {valor: '7dias', nome: 'Últimos 7 dias'},
    {valor: 'mes', nome: 'Este mês'}
  ];

  /** "do dia", "dos últimos 7 dias", "do mês": completa os textos dos cards. */
  readonly contexto = computed(() => ({hoje: 'do dia', '7dias': 'dos últimos 7 dias', mes: 'do mês'})[this.periodo()]);

  // ---------- Indicadores (GET /metrics) ----------
  readonly resumo = signal<MetricasResumo | null>(null);
  readonly erroResumo = signal<string | null>(null);

  readonly ordensPeriodo = computed(() => this.resumo()?.services.total ?? 0);
  readonly pendentes = computed(() => {
    const s = this.resumo()?.services;
    return s ? s.inProgress + s.pending : 0;
  });
  readonly percentualConcluidas = computed(() => {
    const s = this.resumo()?.services;
    return s && s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  });

  // ---------- Ordens em aberto (GET /services, filtrado aqui) ----------
  readonly abertas = signal<Servico[]>([]);
  readonly carregandoOrdens = signal(true);
  readonly erroOrdens = signal<string | null>(null);
  readonly ordensVisiveis = computed(() => this.abertas().slice(0, MAX_ORDENS));
  readonly emExecucao = computed(() => this.abertas().filter((s) => s.status === 'IN_PROGRESS').length);
  readonly aguardando = computed(() => this.abertas().filter((s) => s.status === 'PENDING').length);

  // ---------- Atenção ao estoque (GET /items/alerts) ----------
  readonly alertas = signal<AlertaEstoque[]>([]);
  readonly carregandoAlertas = signal(true);
  readonly erroAlertas = signal<string | null>(null);
  readonly alertasVisiveis = computed(() => this.alertas().slice(0, MAX_ALERTAS));

  // ---------- Últimas movimentações (GET /metrics/activity) ----------
  readonly movimentacoes = signal<Movimentacao[]>([]);
  readonly carregandoAtividade = signal(true);
  readonly erroAtividade = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarResumo();
    this.carregarOrdens();
    this.carregarAlertas();
    this.carregarAtividade();
  }

  aoMudarPeriodo(evento: Event): void {
    this.periodo.set((evento.target as HTMLSelectElement).value as Periodo);
    this.carregarResumo();
  }

  private carregarResumo(): void {
    const fim = dataIso(this.hoje);
    let inicio = fim;
    if (this.periodo() === '7dias') {
      const d = new Date(this.hoje);
      d.setDate(d.getDate() - 6);
      inicio = dataIso(d);
    } else if (this.periodo() === 'mes') {
      inicio = dataIso(new Date(this.hoje.getFullYear(), this.hoje.getMonth(), 1));
    }

    this.erroResumo.set(null);
    this.metricasApi.resumo(inicio, fim).subscribe({
      next: (r) => this.resumo.set(r),
      error: (e: HttpErrorResponse) => {
        this.resumo.set(null);
        this.erroResumo.set(this.mensagem(e, 'os indicadores'));
      }
    });
  }

  private carregarOrdens(): void {
    this.servicosApi.listar().subscribe({
      next: (lista) => {
        // Em execução primeiro; depois pela previsão (sem previsão por último); depois as mais novas
        const abertas = lista
          .filter((s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING')
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === 'IN_PROGRESS' ? -1 : 1;
            if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
            if (a.scheduledAt || b.scheduledAt) return a.scheduledAt ? -1 : 1;
            return b.id - a.id;
          });
        this.abertas.set(abertas);
        this.carregandoOrdens.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.erroOrdens.set(this.mensagem(e, 'as ordens em aberto'));
        this.carregandoOrdens.set(false);
      }
    });
  }

  private carregarAlertas(): void {
    this.itensApi.alertas().subscribe({
      next: (lista) => {
        this.alertas.set(lista);
        this.carregandoAlertas.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.erroAlertas.set(this.mensagem(e, 'os avisos de estoque'));
        this.carregandoAlertas.set(false);
      }
    });
  }

  private carregarAtividade(): void {
    this.metricasApi.atividade(MAX_ATIVIDADES).subscribe({
      next: (lista) => {
        this.movimentacoes.set(lista.map((a) => this.descrever(a)));
        this.carregandoAtividade.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.erroAtividade.set(this.mensagem(e, 'as últimas movimentações'));
        this.carregandoAtividade.set(false);
      }
    });
  }

  // ---------- Regras de exibição ----------

  /** "R$ 960" quando não tem centavos, "R$ 960,50" quando tem (os cards são estreitos). */
  valor(n: number): string {
    const numero = Number(n);
    const texto = numeroParaTexto(numero);
    return Number.isInteger(numero) ? texto.replace(/,00$/, '') : texto;
  }

  numeroOrdem(id: number): string {
    return `#${String(id).padStart(3, '0')}`;
  }

  nomeTipo(valor: string): string {
    return TIPOS_SERVICO.find((t) => t.valor === valor)?.nome ?? '—';
  }

  /** "15:00" se for hoje, "12/11 · 15:00" em outro dia, "A confirmar" sem previsão. */
  previsao(servico: Servico): string {
    if (!servico.scheduledAt) return 'A confirmar';
    const d = new Date(servico.scheduledAt);
    return dataIso(d) === dataIso(this.hoje) ? hora(d) : `${diaMes(d)} · ${hora(d)}`;
  }

  /** Previsão que já passou e a ordem continua aberta. */
  atrasada(servico: Servico): boolean {
    return !!servico.scheduledAt && new Date(servico.scheduledAt).getTime() < Date.now();
  }

  /** Larguras da barra do "Ritmo da oficina" (flex-grow de cada parte). */
  partesRitmo(): { concluidas: number; execucao: number; aguardando: number } {
    const s = this.resumo()?.services;
    return {concluidas: s?.completed ?? 0, execucao: s?.inProgress ?? 0, aguardando: s?.pending ?? 0};
  }

  private descrever(a: Atividade): Movimentacao {
    const d = new Date(a.at);
    const quando = dataIso(d) === dataIso(this.hoje) ? hora(d) : `${diaMes(d)} · ${hora(d)}`;
    const chave = `${a.type}-${a.referenceId}-${a.at}`;
    const cliente = a.clientName ?? 'Balcão (sem cliente)';
    const ordem = `Ordem ${this.numeroOrdem(a.referenceId)}`;
    const venda = `Venda V-${String(a.referenceId).padStart(4, '0')}`;

    switch (a.type) {
      case 'SERVICE_CREATED':
        return {chave, quando, icone: 'cadastro', titulo: `${ordem} cadastrada`, texto: `${cliente} · ${a.detail}`};
      case 'SERVICE_STATUS_CHANGED':
        if (a.status === 'COMPLETED') {
          return {chave, quando, icone: 'concluido', titulo: `${ordem} concluída`,
            texto: `${a.detail} · ${numeroParaTexto(Number(a.amount))} recebidos`};
        }
        if (a.status === 'CANCELED') {
          return {chave, quando, icone: 'cancelado', titulo: `${ordem} cancelada`, texto: `${cliente} · ${a.detail}`};
        }
        return a.status === 'IN_PROGRESS'
          ? {chave, quando, icone: 'execucao', titulo: `${ordem} em execução`, texto: `${cliente} · ${a.detail}`}
          : {chave, quando, icone: 'aguardando', titulo: `${ordem} aguardando`, texto: `${cliente} · ${a.detail}`};
      case 'SALE_CREATED':
        return {chave, quando, icone: 'venda', titulo: `${venda} registrada`,
          texto: `${cliente} · ${a.detail} · ${numeroParaTexto(Number(a.amount))}`};
      case 'SALE_CANCELED':
        return {chave, quando, icone: 'cancelado', titulo: `${venda} cancelada`, texto: `${cliente} · itens devolvidos ao estoque`};
    }
  }

  private mensagem(e: HttpErrorResponse, oQue: string): string {
    if (e.status === 0) return 'Não foi possível conectar ao back-end.';
    if (e.status === 401 || e.status === 403) return 'Sem permissão. Faça login novamente.';
    return `Não foi possível carregar ${oQue}.`;
  }
}
