import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnInit, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PontosCarregandoComponent} from '../../../components/pontos-carregando/pontos-carregando.component';
import {MetricasServicos, MetricasService, SERVICOS_ZERADOS} from '../../../services/metricas.service';
import {Servico, ServicoService, StatusServico} from '../../../services/servico.service';
import {SessionService} from '../../../services/session.service';
import {numeroParaTexto} from '../../../utils/dinheiro';
import {STATUS_SERVICO, TIPOS_SERVICO} from '../../../utils/servico-rotulos';

const ITENS_POR_PAGINA = 8;

// Tira acentos e deixa minúsculo, para a busca achar "fechadura" em "Fechaduras"
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Data local no formato AAAA-MM-DD (o que o backend espera e devolve)
function dataIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// "2026-10-08" -> "08/10/2026" (sem passar por Date, para não deslocar o dia por fuso)
function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

@Component({
  selector: 'app-servicos',
  host: {class: 'listagem'}, // estilos comuns das listagens: src/styles/_listagem.scss
  imports: [RouterLink, PontosCarregandoComponent],
  templateUrl: './servicos.component.html',
  styleUrl: './servicos.component.scss'
})
export class ServicosComponent implements OnInit {
  private readonly servico = inject(ServicoService);
  private readonly metricas = inject(MetricasService);
  private readonly session = inject(SessionService);

  readonly statusOpcoes = STATUS_SERVICO;

  readonly servicos = signal<Servico[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly busca = signal('');
  readonly status = signal<StatusServico | ''>('');
  readonly pagina = signal(1);

  // ---------- Resumo do dia (só administrador) ----------
  private readonly hojeIso = dataIso(new Date());
  readonly hoje = dataBr(this.hojeIso);

  readonly ehAdministrador = computed(() => this.session.user()?.role === 'ADMINISTRATOR');
  readonly resumo = signal<MetricasServicos | null>(null);
  // Os cards aparecem já no primeiro quadro, zerados e com pontinhos no lugar dos números, até o resumo chegar.
  // Num recarregamento (depois de excluir) o carregamento não volta: os números antigos ficam até os novos chegarem
  readonly carregandoResumo = signal(true);
  readonly resumoIndisponivel = signal(false);
  readonly dados = computed(() => this.resumo() ?? SERVICOS_ZERADOS);

  readonly emAberto = computed(() => {
    const r = this.resumo();
    return r ? r.inProgress + r.pending : 0;
  });
  readonly percentualConcluidas = computed(() => {
    const r = this.resumo();
    return r && r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
  });
  readonly ticketMedio = computed(() => {
    const r = this.resumo();
    return r && r.completed > 0 ? r.received / r.completed : 0;
  });

  // ---------- Tabela: filtro e paginação ----------
  readonly filtrados = computed(() => {
    const termo = normalizar(this.busca()).replace(/^#/, '');
    const status = this.status();

    return this.servicos().filter((s) => {
      if (status && s.status !== status) return false;
      if (!termo) return true;
      const texto = normalizar(`${s.clientName} ${this.nomeTipo(s.serviceType)} ${this.numeroServico(s)} ${s.id}`);
      return texto.includes(termo);
    });
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / ITENS_POR_PAGINA)));
  readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  readonly visiveis = computed(() => {
    const inicio = (this.paginaAtual() - 1) * ITENS_POR_PAGINA;
    return this.filtrados().slice(inicio, inicio + ITENS_POR_PAGINA);
  });

  readonly inicio = computed(() => (this.filtrados().length === 0 ? 0 : (this.paginaAtual() - 1) * ITENS_POR_PAGINA + 1));
  readonly fim = computed(() => Math.min(this.paginaAtual() * ITENS_POR_PAGINA, this.filtrados().length));

  // Mostra no máximo 5 números de página ao redor da página atual
  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const primeira = Math.max(1, Math.min(this.paginaAtual() - 2, total - 4));
    const ultima = Math.min(total, primeira + 4);
    const lista: number[] = [];
    for (let p = primeira; p <= ultima; p++) lista.push(p);
    return lista;
  });

  readonly mensagemVazia = computed(() => {
    if (this.carregando()) return 'Carregando serviços…';
    if (this.erro() && this.servicos().length === 0) return 'Não foi possível exibir os serviços.';
    if (this.servicos().length === 0) return 'Nenhum serviço cadastrado ainda. Use o botão Adicionar para cadastrar o primeiro.';
    return 'Nenhum serviço encontrado para essa busca.';
  });

  ngOnInit(): void {
    this.carregar();
    this.carregarResumo();
  }

  private carregar(): void {
    this.servico.listar().subscribe({
      next: (lista) => {
        // Mais recentes primeiro (data de contratação e, no empate, número do serviço)
        const ordenada = [...lista].sort(
          (a, b) => b.hiringDate.localeCompare(a.hiringDate) || b.id - a.id
        );
        this.servicos.set(ordenada);
        this.erro.set(null);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 401) this.erro.set('Você precisa estar logado para ver os serviços.');
        else if (e.status === 0) this.erro.set('Não foi possível conectar ao back-end. Verifique se ele está rodando.');
        else this.erro.set('Não foi possível carregar os serviços agora.');
        this.carregando.set(false);
      }
    });
  }

  // O /metrics é exclusivo do administrador: o funcionário nem chega a chamar
  private carregarResumo(): void {
    this.session.load().subscribe({
      next: (conta) => {
        if (conta.role !== 'ADMINISTRATOR') return;
        this.metricas.resumo(this.hojeIso, this.hojeIso).subscribe({
          next: (r) => {
            this.resumo.set(r.services);
            this.resumoIndisponivel.set(false);
            this.carregandoResumo.set(false);
          },
          // sem o resumo os cards somem e a lista continua funcionando
          error: () => {
            this.resumo.set(null);
            this.resumoIndisponivel.set(true);
            this.carregandoResumo.set(false);
          }
        });
      }
    });
  }

  // ---------- Eventos da tela ----------
  aoBuscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  aoMudarStatus(evento: Event): void {
    this.status.set((evento.target as HTMLSelectElement).value as StatusServico | '');
    this.pagina.set(1);
  }

  irPara(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  excluir(servico: Servico): void {
    const mensagem = `Excluir o serviço ${this.numeroServico(servico)} de ${servico.clientName}? Essa ação não pode ser desfeita.`;
    if (!confirm(mensagem)) return;

    this.servico.excluir(servico.id).subscribe({
      next: () => {
        this.servicos.update((lista) => lista.filter((s) => s.id !== servico.id));
        this.erro.set(null);
        if (this.ehAdministrador()) this.carregarResumo();
      },
      error: (e: HttpErrorResponse) =>
        this.erro.set(e.status === 404 ? 'Esse serviço já não existe mais.' : 'Não foi possível excluir o serviço.')
    });
  }

  // ---------- Regras de exibição ----------
  numeroServico(servico: Servico): string {
    return `#${String(servico.id).padStart(3, '0')}`;
  }

  nomeTipo(valor: string): string {
    return TIPOS_SERVICO.find((t) => t.valor === valor)?.nome ?? '—';
  }

  nomeStatus(valor: string): string {
    return STATUS_SERVICO.find((s) => s.valor === valor)?.nome ?? '—';
  }

  data(iso: string): string {
    return dataBr(iso);
  }

  moeda(valor: number): string {
    return numeroParaTexto(Number(valor));
  }
}
