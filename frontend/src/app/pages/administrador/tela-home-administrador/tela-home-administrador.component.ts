import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';
import {IconeComponent, NomeIcone} from '../../../components/icone/icone.component';
import {AlertaEstoque, ItemService} from '../../../services/item.service';
import {Atividade, MetricasResumo, MetricasService} from '../../../services/metricas.service';
import {Servico, ServicoService} from '../../../services/servico.service';
import {SessionService} from '../../../services/session.service';
import {numeroParaTexto} from '../../../utils/dinheiro';
import {
  dataBr,
  dataIso,
  diaMes,
  horaOuData,
  moedaCurta,
  numeroServico,
  ordenarAlertas,
  servicosEmAberto,
  pluralizar,
  previsaoCurta,
  primeiroNome
} from '../../../utils/home';
import {STATUS_SERVICO, TIPOS_SERVICO} from '../../../utils/servico-rotulos';

const LIMITE_SERVICOS = 8;
const LIMITE_ALERTAS = 4;
const LIMITE_MOVIMENTOS = 3;

interface Indicador {
  id: string;
  rotulo: string;
  valor: string;
  texto: string;
  icone: NomeIcone;
  destaque?: boolean;
}

interface Movimento {
  id: string;
  hora: string;
  titulo: string;
  detalhe: string;
  icone: NomeIcone;
}

/**
 * Home do administrador: indicadores do dia, serviços em aberto, ritmo da oficina,
 * estoque abaixo do mínimo e últimas movimentações.
 * * Cada bloco carrega independentemente: se um falhar, os demais continuam a ser exibidos.
 */
@Component({
  selector: 'app-tela-home-administrador',
  imports: [RouterLink, IconeComponent],
  templateUrl: './tela-home-administrador.component.html',
  styleUrl: './tela-home-administrador.component.scss'
})
export class TelaHomeAdministradorComponent implements OnInit, OnDestroy {
  private readonly metricas = inject(MetricasService);
  private readonly servicosService = inject(ServicoService);
  private readonly itens = inject(ItemService);
  private readonly session = inject(SessionService);

  readonly nome = computed(() => primeiroNome(this.session.user()?.name));

  // ---------- Dia dos indicadores ----------
  readonly hojeIso = dataIso(new Date());
  readonly diaHoje = diaMes(this.hojeIso);
  readonly dataSelecionada = signal(this.hojeIso);
  readonly rotuloData = computed(() =>
    this.dataSelecionada() === this.hojeIso ? `Hoje, ${this.diaHoje}` : dataBr(this.dataSelecionada())
  );

  // ---------- Indicadores e ritmo (GET /metrics) ----------
  readonly resumo = signal<MetricasResumo | null>(null);
  readonly erroResumo = signal<string | null>(null);

  readonly indicadores = computed<Indicador[]>(() => {
    const r = this.resumo();

    if (!r) {
      const texto = this.erroResumo() ? 'Indisponível' : 'Carregando…';
      return [
        {id: 'realizados', rotulo: 'Serviços realizados', valor: '—', texto, icone: 'concluido'},
        {id: 'pendentes', rotulo: 'Serviços pendentes', valor: '—', texto, icone: 'relogio'},
        {id: 'faturamento', rotulo: 'Faturamento total', valor: '—', texto, icone: 'carteira'},
        {id: 'lucro', rotulo: 'Lucro estimado', valor: '—', texto, icone: 'carteira', destaque: true},
        {id: 'despesas', rotulo: 'Despesas com peças e materiais', valor: '—', texto, icone: 'caixa'}
      ];
    }

    const s = r.services;
    const t = r.totals;
    const vendas = r.sales.completed;
    const fechados = s.completed + vendas;
    const ticketMedio = fechados > 0 ? t.revenue / fechados : 0;
    const origem =
      vendas > 0
        ? `${s.completed} ${pluralizar(s.completed, 'serviço', 'serviços')} e ${vendas} ${pluralizar(vendas, 'venda', 'vendas')}`
        : `${s.completed} ${pluralizar(s.completed, 'serviço', 'serviços')}`;
    const percentual = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

    return [
      {
        id: 'realizados',
        rotulo: 'Serviços realizados',
        valor: String(s.completed),
        texto: `${percentual}% dos ${s.total} ${pluralizar(s.total, 'serviço', 'serviços')} do dia`,
        icone: 'concluido'
      },
      {
        id: 'pendentes',
        rotulo: 'Serviços pendentes',
        valor: String(s.inProgress + s.pending),
        texto: `${s.inProgress} em execução · ${s.pending} aguardando`,
        icone: 'relogio'
      },
      {
        id: 'faturamento',
        rotulo: 'Faturamento total',
        valor: moedaCurta(t.revenue),
        texto: `${origem} · ticket médio ${moedaCurta(ticketMedio)}`,
        icone: 'carteira'
      },
      {
        id: 'lucro',
        rotulo: 'Lucro estimado',
        valor: moedaCurta(t.estimatedProfit),
        texto: `${moedaCurta(t.revenue)} - ${moedaCurta(t.partsCost)} (peças e materiais)`,
        icone: 'carteira',
        destaque: true
      },
      {
        id: 'despesas',
        rotulo: 'Despesas com peças e materiais',
        valor: moedaCurta(t.partsCost),
        texto: 'Base para cálculo do lucro estimado',
        icone: 'caixa'
      }
    ];
  });

  readonly percentualConcluidas = computed(() => {
    const s = this.resumo()?.services;
    return s && s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  });

  // Largura de cada trecho da barra "Ritmo da oficina" (em %)
  readonly barra = computed(() => {
    const s = this.resumo()?.services;
    if (!s || s.total === 0) return {concluidas: 0, execucao: 0, aguardando: 0};
    return {
      concluidas: (s.completed / s.total) * 100,
      execucao: (s.inProgress / s.total) * 100,
      aguardando: (s.pending / s.total) * 100
    };
  });

  // Números da lista do "Ritmo da oficina" ('—' enquanto não carregou)
  readonly contagens = computed(() => {
    const s = this.resumo()?.services;
    return {
      concluidas: s ? String(s.completed) : '—',
      execucao: s ? String(s.inProgress) : '—',
      aguardando: s ? String(s.pending) : '—'
    };
  });

  // ---------- Serviços em aberto (GET /services) ----------
  readonly servicos = signal<Servico[]>([]);
  readonly carregandoServicos = signal(true);
  readonly erroServicos = signal<string | null>(null);

  readonly servicosVisiveis = computed(() => this.servicos().slice(0, LIMITE_SERVICOS));
  readonly servicosOcultos = computed(() => Math.max(0, this.servicos().length - LIMITE_SERVICOS));
  readonly emExecucao = computed(() => this.servicos().filter((s) => s.status === 'IN_PROGRESS').length);
  readonly aguardando = computed(() => this.servicos().filter((s) => s.status === 'PENDING').length);

  readonly textoServicos = computed(() => {
    if (this.carregandoServicos()) return 'Carregando serviços…';
    if (this.erroServicos()) return 'Não foi possível exibir os serviços.';
    if (this.servicos().length === 0) return 'Nenhum serviço em aberto no momento.';
    return `${this.emExecucao()} em execução e ${this.aguardando()} aguardando aprovação do orçamento.`;
  });

  // ---------- Estoque abaixo do mínimo (GET /items/alerts) ----------
  readonly alertas = signal<AlertaEstoque[]>([]);
  readonly carregandoAlertas = signal(true);
  readonly erroAlertas = signal<string | null>(null);

  readonly alertasVisiveis = computed(() => this.alertas().slice(0, LIMITE_ALERTAS));
  readonly alertasOcultos = computed(() => Math.max(0, this.alertas().length - LIMITE_ALERTAS));

  // ---------- Últimas movimentações (GET /metrics/activity) ----------
  readonly movimentos = signal<Movimento[]>([]);
  readonly carregandoMovimentos = signal(true);
  readonly erroMovimentos = signal<string | null>(null);
  private readonly todasDeHoje = signal(false);

  readonly rotuloMovimentos = computed(() => (this.todasDeHoje() ? 'Hoje · atividade recente' : 'Atividade recente'));

  private pedidoResumo?: Subscription;

  ngOnInit(): void {
    this.carregarResumo();
    this.carregarServicos();
    this.carregarAlertas();
    this.carregarMovimentos();
  }

  ngOnDestroy(): void {
    this.pedidoResumo?.unsubscribe();
  }

  // ---------- Carregamento ----------
  private carregarResumo(): void {
    // Cancela o pedido anterior: se a pessoa troca de dia rápido, vale só o último
    this.pedidoResumo?.unsubscribe();
    this.resumo.set(null);
    this.erroResumo.set(null);

    const dia = this.dataSelecionada();
    this.pedidoResumo = this.metricas.resumo(dia, dia).subscribe({
      next: (r) => this.resumo.set(r),
      error: (e: HttpErrorResponse) =>
        this.erroResumo.set(
          e.status === 0
            ? 'Sem conexão com o servidor. Não foi possível carregar os indicadores.'
            : 'Não foi possível carregar os indicadores agora.'
        )
    });
  }

  private carregarServicos(): void {
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
  }

  private carregarAlertas(): void {
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

  private carregarMovimentos(): void {
    this.metricas.atividade(LIMITE_MOVIMENTOS).subscribe({
      next: (lista) => {
        const agora = new Date();
        this.movimentos.set(lista.map((a) => this.montarMovimento(a, agora)));
        this.todasDeHoje.set(
          lista.length > 0 && lista.every((a) => dataIso(new Date(a.at)) === dataIso(agora))
        );
        this.carregandoMovimentos.set(false);
      },
      error: () => {
        this.erroMovimentos.set('Não foi possível carregar as movimentações agora.');
        this.carregandoMovimentos.set(false);
      }
    });
  }

  // ---------- Eventos da tela ----------
  abrirCalendario(campo: HTMLInputElement): void {
    try {
      campo.showPicker();
    } catch {
      // Navegador sem showPicker(): abre pelo foco/clique do próprio campo
      campo.focus();
      campo.click();
    }
  }

  aoMudarData(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    if (!valor || valor === this.dataSelecionada()) return;
    this.dataSelecionada.set(valor);
    this.carregarResumo();
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

  // Monta o texto de cada acontecimento (o back só devolve os dados)
  private montarMovimento(a: Atividade, agora: Date): Movimento {
    const id = `${a.type}-${a.referenceId}-${a.at}`;
    const hora = horaOuData(a.at, agora);
    const numero = numeroServico(a.referenceId);
    const cliente = a.clientName?.trim() || 'Venda de balcão';
    const servico = `${a.clientName ?? ''} · ${a.detail}`;

    switch (a.type) {
      case 'SERVICE_CREATED':
        return {id, hora, titulo: `Serviço ${numero} cadastrado`, detalhe: servico, icone: 'prancheta'};

      case 'SERVICE_STATUS_CHANGED':
        switch (a.status) {
          case 'COMPLETED':
            return {
              id,
              hora,
              titulo: `Serviço ${numero} concluído`,
              detalhe: `${a.detail} · ${numeroParaTexto(Number(a.amount))} recebidos`,
              icone: 'concluido'
            };
          case 'IN_PROGRESS':
            return {id, hora, titulo: `Serviço ${numero} em execução`, detalhe: servico, icone: 'ferramenta'};
          case 'CANCELED':
            return {id, hora, titulo: `Serviço ${numero} cancelado`, detalhe: servico, icone: 'cancelado'};
          default:
            return {id, hora, titulo: `Serviço ${numero} aguardando aprovação`, detalhe: servico, icone: 'prancheta'};
        }

      case 'SALE_CANCELED':
        return {
          id,
          hora,
          titulo: `Venda ${numero} cancelada`,
          detalhe: `${cliente} · ${a.detail} · ${numeroParaTexto(Number(a.amount))}`,
          icone: 'cancelado'
        };

      case 'SALE_CREATED':
      default:
        return {
          id,
          hora,
          titulo: `Venda ${numero} registrada`,
          detalhe: `${cliente} · ${a.detail} · ${numeroParaTexto(Number(a.amount))}`,
          icone: 'carrinho'
        };
    }
  }
}
