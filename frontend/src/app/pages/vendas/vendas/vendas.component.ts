import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnInit, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {MetricasResumo, MetricasService} from '../../../services/metricas.service';
import {SessionService} from '../../../services/session.service';
import {FormaPagamento, StatusVenda, Venda, VendaService} from '../../../services/venda.service';
import {numeroParaTexto} from '../../../utils/dinheiro';

const ITENS_POR_PAGINA = 8;

const FORMAS_PAGAMENTO: { valor: FormaPagamento; nome: string }[] = [
  {valor: 'CASH', nome: 'Dinheiro'},
  {valor: 'PIX', nome: 'Pix'},
  {valor: 'DEBIT_CARD', nome: 'Débito'},
  {valor: 'CREDIT_CARD', nome: 'Crédito'}
];

const STATUS_VENDA: Record<StatusVenda, string> = {
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada'
};

// Tira acentos e deixa minúsculo, para a busca achar "chave" em "Chaves"
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Data local no formato AAAA-MM-DD (o que o backend espera)
function dataIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'app-vendas',
  imports: [RouterLink],
  templateUrl: './vendas.component.html',
  styleUrl: './vendas.component.scss'
})
export class VendasComponent implements OnInit {
  private readonly vendaApi = inject(VendaService);
  private readonly metricas = inject(MetricasService);
  private readonly session = inject(SessionService);

  readonly formasPagamento = FORMAS_PAGAMENTO;

  readonly vendas = signal<Venda[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly busca = signal('');
  readonly pagamento = signal<FormaPagamento | ''>('');
  readonly pagina = signal(1);

  // ---------- Resumo do dia (só administrador) ----------
  private readonly hojeIso = dataIso(new Date());

  readonly ehAdministrador = computed(() => this.session.user()?.role === 'ADMINISTRATOR');
  readonly resumo = signal<MetricasResumo['sales'] | null>(null);

  /** Quantidade de vendas registradas hoje (inclui canceladas), usada no selo do histórico. */
  readonly vendasHoje = computed(
    () => this.vendas().filter((v) => dataIso(new Date(v.createdAt)) === this.hojeIso).length
  );

  // ---------- Tabela: filtro e paginação ----------
  readonly filtradas = computed(() => {
    const termo = normalizar(this.busca());
    const pagamento = this.pagamento();

    return this.vendas().filter((v) => {
      if (pagamento && v.paymentMethod !== pagamento) return false;
      if (!termo) return true;
      const itens = v.items.map((i) => `${i.itemName} ${i.itemCode}`).join(' ');
      const texto = normalizar(`${this.numero(v)} ${v.id} ${this.cliente(v)} ${itens}`);
      return texto.includes(termo);
    });
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / ITENS_POR_PAGINA)));
  readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  readonly visiveis = computed(() => {
    const inicio = (this.paginaAtual() - 1) * ITENS_POR_PAGINA;
    return this.filtradas().slice(inicio, inicio + ITENS_POR_PAGINA);
  });

  readonly inicio = computed(() => (this.filtradas().length === 0 ? 0 : (this.paginaAtual() - 1) * ITENS_POR_PAGINA + 1));
  readonly fim = computed(() => Math.min(this.paginaAtual() * ITENS_POR_PAGINA, this.filtradas().length));

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
    if (this.carregando()) return 'Carregando vendas…';
    if (this.erro() && this.vendas().length === 0) return 'Não foi possível exibir as vendas.';
    if (this.vendas().length === 0) return 'Nenhuma venda registrada ainda. Use o botão Nova venda para registrar a primeira.';
    return 'Nenhuma venda encontrada para essa busca.';
  });

  ngOnInit(): void {
    this.carregar();
    this.carregarResumo();
  }

  private carregar(): void {
    // O backend já devolve das mais recentes para as mais antigas
    this.vendaApi.listar().subscribe({
      next: (lista) => {
        this.vendas.set(lista);
        this.erro.set(null);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 401) this.erro.set('Você precisa estar logado para ver as vendas.');
        else if (e.status === 0) this.erro.set('Não foi possível conectar ao back-end. Verifique se ele está rodando.');
        else this.erro.set('Não foi possível carregar as vendas agora.');
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
          next: (r) => this.resumo.set(r.sales),
          error: () => this.resumo.set(null) // sem o resumo a lista continua funcionando
        });
      }
    });
  }

  // ---------- Eventos da tela ----------
  aoBuscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  aoMudarPagamento(evento: Event): void {
    this.pagamento.set((evento.target as HTMLSelectElement).value as FormaPagamento | '');
    this.pagina.set(1);
  }

  irPara(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  cancelar(venda: Venda): void {
    const mensagem = `Cancelar a venda ${this.numero(venda)}? Os itens voltam para o estoque e a venda fica no histórico como cancelada.`;
    if (!confirm(mensagem)) return;

    this.vendaApi.cancelar(venda.id).subscribe({
      next: (atualizada) => {
        this.vendas.update((lista) => lista.map((v) => (v.id === atualizada.id ? atualizada : v)));
        this.erro.set(null);
        if (this.ehAdministrador()) this.carregarResumo();
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 409) this.erro.set('Essa venda já estava cancelada.');
        else if (e.status === 404) this.erro.set('Essa venda já não existe mais.');
        else this.erro.set('Não foi possível cancelar a venda.');
      }
    });
  }

  // ---------- Regras de exibição ----------
  numero(venda: Venda): string {
    return `V-${String(venda.id).padStart(4, '0')}`;
  }

  cliente(venda: Venda): string {
    return venda.clientName ?? 'Balcão (sem cliente)';
  }

  /** "08/10 · 16:12" */
  dataHora(iso: string): string {
    const d = new Date(iso);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const minuto = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} · ${hora}:${minuto}`;
  }

  unidades(venda: Venda): number {
    return venda.items.reduce((soma, i) => soma + i.quantity, 0);
  }

  /** "Pix", "Dinheiro", "Débito", "Crédito 2x" */
  pagamentoTexto(venda: Venda): string {
    const nome = FORMAS_PAGAMENTO.find((f) => f.valor === venda.paymentMethod)?.nome ?? '—';
    return venda.paymentMethod === 'CREDIT_CARD' ? `${nome} ${venda.installments}x` : nome;
  }

  nomeStatus(status: StatusVenda): string {
    return STATUS_VENDA[status] ?? '—';
  }

  moeda(valor: number): string {
    return numeroParaTexto(Number(valor));
  }
}
