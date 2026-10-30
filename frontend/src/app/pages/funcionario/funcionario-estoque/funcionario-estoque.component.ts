import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Item, ItemService } from '../../../services/item.service';
import { numeroParaTexto } from '../../../utils/dinheiro';

const ITENS_POR_PAGINA = 8;

// Tira acentos e deixa minúsculo, para a busca achar "fechadura" em "Fechaduras"
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-funcionario-estoque',
  imports: [RouterLink],
  templateUrl: './funcionario-estoque.component.html',
  styleUrl: './funcionario-estoque.component.scss'
})
export class FuncionarioEstoqueComponent implements OnInit {
  private readonly servico = inject(ItemService);

  // TODO: o backend ainda não guarda a categoria do item
  readonly categorias = [
    { valor: 'CHAVES_VIRGENS', nome: 'Chaves virgens' },
    { valor: 'CHAVES_AUTOMOTIVAS', nome: 'Chaves automotivas' },
    { valor: 'CONTROLES_REMOTOS', nome: 'Controles remotos' },
    { valor: 'FECHADURAS', nome: 'Fechaduras' },
    { valor: 'CILINDROS_MIOLOS', nome: 'Cilindros e miolos' },
    { valor: 'CADEADOS', nome: 'Cadeados' },
    { valor: 'PECAS_REPOSICAO', nome: 'Peças de reposição' },
    { valor: 'BATERIAS_PILHAS', nome: 'Baterias e pilhas' },
    { valor: 'ACESSORIOS', nome: 'Acessórios' },
    { valor: 'FERRAMENTAS_INSUMOS', nome: 'Ferramentas e insumos' },
    { valor: 'OUTROS', nome: 'Outros' }
  ];

  readonly itens = signal<Item[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly busca = signal('');
  readonly categoria = signal('');
  readonly pagina = signal(1);

  // ---------- Indicadores do topo ----------
  readonly total = computed(() => this.itens().length);
  readonly itensAbaixo = computed(() => this.itens().filter((i) => this.abaixo(i)));
  readonly regulares = computed(() => this.total() - this.itensAbaixo().length);
  readonly nomesAbaixo = computed(() =>
    this.itensAbaixo()
      .slice(0, 3)
      .map((i) => i.name)
      .join(' · ')
  );

  // ---------- Tabela: filtro e paginação ----------
  readonly filtrados = computed(() => {
    const termo = normalizar(this.busca());
    const categoria = this.categoria();

    return this.itens().filter((item) => {
      if (categoria && item.category !== categoria) return false;
      if (!termo) return true;
      const texto = normalizar(`${item.name} ${item.idCode} ${this.nomeCategoria(item.category)}`);
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
    if (this.carregando()) return 'Carregando itens…';
    if (this.erro() && this.itens().length === 0) return 'Não foi possível exibir os itens.';
    if (this.itens().length === 0) return 'Nenhum item cadastrado ainda. Use o botão Adicionar para cadastrar o primeiro.';
    return 'Nenhum item encontrado para essa busca.';
  });

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    this.servico.listar().subscribe({
      next: (lista) => {
        // Itens abaixo do mínimo primeiro, depois ordem alfabética
        const ordenada = [...lista].sort(
          (a, b) => Number(this.abaixo(b)) - Number(this.abaixo(a)) || a.name.localeCompare(b.name, 'pt-BR')
        );
        this.itens.set(ordenada);
        this.erro.set(null);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 401) this.erro.set('Você precisa estar logado para ver os itens.');
        else if (e.status === 0) this.erro.set('Não foi possível conectar ao back-end. Verifique se ele está rodando.');
        else this.erro.set('Não foi possível carregar os itens agora.');
        this.carregando.set(false);
      }
    });
  }

  // ---------- Eventos da tela ----------
  aoBuscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  aoMudarCategoria(evento: Event): void {
    this.categoria.set((evento.target as HTMLSelectElement).value);
    this.pagina.set(1);
  }

  irPara(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  excluir(item: Item): void {
    if (!confirm(`Excluir o item "${item.name}"? Essa ação não pode ser desfeita.`)) return;

    this.servico.excluir(item.id).subscribe({
      next: () => {
        this.itens.update((lista) => lista.filter((i) => i.id !== item.id));
        this.erro.set(null);
      },
      error: () => this.erro.set('Não foi possível excluir o item.')
    });
  }

  // ---------- Regras de exibição ----------
  // Mesma regra do backend (alertas da Home): estoque menor ou igual ao mínimo
  abaixo(item: Item): boolean {
    return item.stock <= item.minStock;
  }

  rotuloStatus(item: Item): string {
    if (item.stock === 0) return 'Sem estoque';
    return this.abaixo(item) ? 'Abaixo do mínimo' : 'Disponível';
  }

  nomeCategoria(valor?: string): string {
    return this.categorias.find((c) => c.valor === valor)?.nome ?? '—';
  }

  moeda(valor: number): string {
    return numeroParaTexto(Number(valor));
  }
}