import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Item, ItemService } from '../../../services/item.service';
import { FormaPagamento, NovaVenda, VendaService } from '../../../services/venda.service';
import { numeroParaTexto, textoParaNumero } from '../../../utils/dinheiro';

function dinheiroValido(controle: AbstractControl): ValidationErrors | null {
  const texto = String(controle.value ?? '').trim();
  if (texto === '') return null;
  const numero = textoParaNumero(texto);
  if (numero === null) return { dinheiro: true };
  return numero < 0 ? { negativo: true } : null;
}

/** Opcional, mas se preenchido precisa ter 11 dígitos. */
function cpfValido(controle: AbstractControl): ValidationErrors | null {
  const numeros = String(controle.value ?? '').replace(/\D/g, '');
  return numeros === '' || numeros.length === 11 ? null : { cpf: true };
}

/** Opcional, mas se preenchido precisa ter DDD + 8 ou 9 dígitos. */
function telefoneValido(controle: AbstractControl): ValidationErrors | null {
  const numeros = String(controle.value ?? '').replace(/\D/g, '');
  return numeros === '' || numeros.length === 10 || numeros.length === 11 ? null : { telefone: true };
}

/** Remove acentos e deixa minúsculo, para a busca achar "cilindro" digitando "CILÍNDRO". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

interface OpcaoPagamento {
  valor: FormaPagamento;
  nome: string;
  dica?: string;
}

interface LinhaVenda {
  item: Item;
  quantidade: number;
}

@Component({
  selector: 'app-nova-venda',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './nova-venda.component.html',
  styleUrl: './nova-venda.component.scss'
})
export class NovaVendaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly itensApi = inject(ItemService);
  private readonly vendas = inject(VendaService);
  private readonly router = inject(Router);

  private readonly campoQuantidade = viewChild<ElementRef<HTMLInputElement>>('campoQuantidade');
  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');

  readonly formasPagamento: OpcaoPagamento[] = [
    { valor: 'CASH', nome: 'Dinheiro', dica: 'Calcula o troco ao finalizar' },
    { valor: 'PIX', nome: 'Pix' },
    { valor: 'DEBIT_CARD', nome: 'Cartão de débito' },
    { valor: 'CREDIT_CARD', nome: 'Cartão de crédito', dica: 'Habilita o campo Parcelas' }
  ];

  readonly opcoesParcelas = Array.from({ length: 12 }, (_, i) => i + 1);

  readonly form = this.fb.nonNullable.group({
    clientName: [''],
    clientPhone: ['', [telefoneValido]],
    clientCpf: ['', [cpfValido]],
    paymentMethod: this.fb.nonNullable.control<FormaPagamento | ''>('', [Validators.required]),
    installments: [1],
    received: ['', [dinheiroValido]],
    discount: ['', [dinheiroValido]],
    observations: ['']
  });

  // ---------- Estoque e busca ----------
  readonly estoque = signal<Item[]>([]);
  readonly carregandoEstoque = signal(true);
  readonly erroEstoque = signal<string | null>(null);

  readonly busca = signal('');
  readonly buscaAberta = signal(false);
  readonly destaqueBusca = signal(0);
  readonly itemSelecionado = signal<Item | null>(null);
  readonly quantidade = signal(1);
  readonly erroAdicionar = signal<string | null>(null);

  readonly resultados = computed(() => {
    const termo = normalizar(this.busca().trim());
    if (termo === '') return [];
    return this.estoque()
      .filter((i) => normalizar(i.name).includes(termo) || normalizar(i.idCode).includes(termo))
      .slice(0, 8);
  });

  // ---------- Itens da venda ----------
  readonly linhas = signal<LinhaVenda[]>([]);
  readonly totalUnidades = computed(() => this.linhas().reduce((soma, l) => soma + l.quantidade, 0));
  readonly subtotal = computed(() => this.linhas().reduce((soma, l) => soma + l.item.sellPrice * l.quantidade, 0));
  readonly semItens = signal(false);

  // ---------- Dropdown de pagamento ----------
  readonly pagamentoAberto = signal(false);
  readonly destaquePagamento = signal(0);

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarEstoque();
  }

  carregarEstoque(): void {
    this.carregandoEstoque.set(true);
    this.erroEstoque.set(null);
    this.itensApi.listar().subscribe({
      next: (itens) => {
        this.estoque.set(itens);
        // Atualiza o estoque das linhas já adicionadas (ex.: depois de um 409)
        this.linhas.update((ls) => ls.map((l) => ({ ...l, item: itens.find((i) => i.id === l.item.id) ?? l.item })));
        this.carregandoEstoque.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.carregandoEstoque.set(false);
        this.erroEstoque.set(this.mensagemHttp(e, 'carregar os itens do estoque'));
      }
    });
  }

  // ================= Busca de itens =================

  quantidadeNaVenda(item: Item): number {
    return this.linhas().find((l) => l.item.id === item.id)?.quantidade ?? 0;
  }

  disponivel(item: Item): number {
    return item.stock - this.quantidadeNaVenda(item);
  }

  /** Separa o nome em partes para deixar em negrito o trecho que bate com a busca. */
  partesNome(nome: string): { texto: string; destaque: boolean }[] {
    const termo = normalizar(this.busca().trim());
    const inicio = termo ? normalizar(nome).indexOf(termo) : -1;
    if (inicio < 0) return [{ texto: nome, destaque: false }];
    const fim = inicio + termo.length;
    return [
      { texto: nome.slice(0, inicio), destaque: false },
      { texto: nome.slice(inicio, fim), destaque: true },
      { texto: nome.slice(fim), destaque: false }
    ].filter((p) => p.texto !== '');
  }

  aoDigitarBusca(valor: string): void {
    this.busca.set(valor);
    this.itemSelecionado.set(null);
    this.erroAdicionar.set(null);
    this.destaqueBusca.set(this.primeiroDisponivel());
    this.buscaAberta.set(valor.trim() !== '');
  }

  teclaBusca(evento: KeyboardEvent): void {
    const lista = this.resultados();
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        evento.preventDefault();
        if (!this.buscaAberta()) {
          this.buscaAberta.set(lista.length > 0);
          return;
        }
        this.destaqueBusca.set(this.proximoDisponivel(evento.key === 'ArrowDown' ? 1 : -1));
        break;
      }
      case 'Enter': {
        evento.preventDefault();
        const item = this.buscaAberta() ? lista[this.destaqueBusca()] : this.itemSelecionado();
        if (item && this.disponivel(item) > 0) {
          this.itemSelecionado.set(item);
          this.adicionar();
        }
        break;
      }
      case 'Escape':
        this.buscaAberta.set(false);
        break;
    }
  }

  escolherResultado(item: Item): void {
    if (this.disponivel(item) <= 0) return;
    this.itemSelecionado.set(item);
    this.busca.set(item.name);
    this.buscaAberta.set(false);
    this.erroAdicionar.set(null);
    this.campoQuantidade()?.nativeElement.focus();
  }

  aoMudarQuantidade(valor: string): void {
    const n = Math.floor(Number(valor));
    this.quantidade.set(Number.isFinite(n) ? n : 0);
  }

  adicionar(): void {
    this.erroAdicionar.set(null);
    const item = this.itemSelecionado();
    const qtd = this.quantidade();

    if (!item) {
      this.erroAdicionar.set('Selecione um item da lista de resultados.');
      return;
    }
    if (qtd < 1) {
      this.erroAdicionar.set('A quantidade precisa ser pelo menos 1.');
      return;
    }
    if (qtd > this.disponivel(item)) {
      this.erroAdicionar.set(`Só há ${this.disponivel(item)} un. disponíveis de ${item.name}.`);
      return;
    }

    this.linhas.update((ls) => {
      const existente = ls.find((l) => l.item.id === item.id);
      return existente
        ? ls.map((l) => (l === existente ? { ...l, quantidade: l.quantidade + qtd } : l))
        : [...ls, { item, quantidade: qtd }];
    });

    this.semItens.set(false);
    this.itemSelecionado.set(null);
    this.busca.set('');
    this.quantidade.set(1);
    this.buscaAberta.set(false);
    this.campoBusca()?.nativeElement.focus();
  }

  alterarQuantidade(linha: LinhaVenda, delta: number): void {
    const nova = linha.quantidade + delta;
    if (nova < 1 || nova > linha.item.stock) return;
    this.linhas.update((ls) => ls.map((l) => (l === linha ? { ...l, quantidade: nova } : l)));
  }

  remover(linha: LinhaVenda): void {
    this.linhas.update((ls) => ls.filter((l) => l !== linha));
  }

  private primeiroDisponivel(): number {
    const i = this.resultados().findIndex((item) => this.disponivel(item) > 0);
    return i < 0 ? 0 : i;
  }

  /** Anda pela lista pulando os itens sem estoque. */
  private proximoDisponivel(passo: 1 | -1): number {
    const lista = this.resultados();
    let i = this.destaqueBusca();
    for (let n = 0; n < lista.length; n++) {
      i = (i + passo + lista.length) % lista.length;
      if (this.disponivel(lista[i]) > 0) return i;
    }
    return this.destaqueBusca();
  }

  // ================= Dropdown de pagamento =================

  get pagamentoAtual(): OpcaoPagamento | undefined {
    return this.formasPagamento.find((f) => f.valor === this.form.controls.paymentMethod.value);
  }

  get ehCredito(): boolean {
    return this.form.controls.paymentMethod.value === 'CREDIT_CARD';
  }

  get ehDinheiro(): boolean {
    return this.form.controls.paymentMethod.value === 'CASH';
  }

  alternarPagamento(): void {
    if (this.pagamentoAberto()) {
      this.fecharPagamento();
      return;
    }
    const atual = this.formasPagamento.findIndex((f) => f.valor === this.form.controls.paymentMethod.value);
    this.destaquePagamento.set(Math.max(atual, 0));
    this.pagamentoAberto.set(true);
  }

  teclaPagamento(evento: KeyboardEvent): void {
    const total = this.formasPagamento.length;
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        evento.preventDefault();
        if (!this.pagamentoAberto()) {
          this.alternarPagamento();
          return;
        }
        this.destaquePagamento.update((i) => (i + (evento.key === 'ArrowDown' ? 1 : -1) + total) % total);
        break;
      case 'Enter':
      case ' ':
        evento.preventDefault();
        if (this.pagamentoAberto()) this.escolherPagamento(this.formasPagamento[this.destaquePagamento()]);
        else this.alternarPagamento();
        break;
      case 'Escape':
      case 'Tab':
        this.fecharPagamento();
        break;
    }
  }

  escolherPagamento(opcao: OpcaoPagamento): void {
    this.form.controls.paymentMethod.setValue(opcao.valor);
    this.form.controls.paymentMethod.markAsTouched();
    if (opcao.valor !== 'CREDIT_CARD') this.form.controls.installments.setValue(1);
    if (opcao.valor !== 'CASH') this.form.controls.received.setValue('');
    this.pagamentoAberto.set(false);
  }

  private fecharPagamento(): void {
    if (!this.pagamentoAberto()) return;
    this.pagamentoAberto.set(false);
    this.form.controls.paymentMethod.markAsTouched();
  }

  /** Fecha os dois painéis ao clicar fora deles. */
  @HostListener('document:click', ['$event'])
  aoClicarFora(evento: MouseEvent): void {
    const alvo = evento.target as HTMLElement;
    if (!alvo.closest('.dropdown')) this.fecharPagamento();
    if (!alvo.closest('.busca')) this.buscaAberta.set(false);
  }

  // ================= Totais =================

  get desconto(): number {
    const n = textoParaNumero(this.form.controls.discount.value);
    return n !== null && n > 0 ? n : 0;
  }

  get total(): number {
    return Math.max(this.subtotal() - this.desconto, 0);
  }

  get descontoMaiorQueSubtotal(): boolean {
    return this.desconto > 0 && this.desconto > this.subtotal();
  }

  get valorRecebido(): number | null {
    return textoParaNumero(this.form.controls.received.value);
  }

  get troco(): number | null {
    const recebido = this.valorRecebido;
    return recebido === null ? null : recebido - this.total;
  }

  get resumoPagamento(): string {
    const forma = this.pagamentoAtual;
    if (!forma) return 'Forma de pagamento não selecionada';
    if (!this.ehCredito) return `Pagamento: ${forma.nome} · à vista`;
    const parcelas = Number(this.form.controls.installments.value);
    return parcelas > 1
      ? `Pagamento: ${forma.nome} · ${parcelas}x de ${this.dinheiro(this.total / parcelas)}`
      : `Pagamento: ${forma.nome} · à vista`;
  }

  // Volta para a lista de vendas da área atual (funcionário ou administrador)
  voltarPara(): string {
    return this.router.url.startsWith('/administrador') ? '/administrador/vendas' : '/funcionario/vendas';
  }

  dinheiro(valor: number): string {
    return numeroParaTexto(valor);
  }

  formatarDinheiro(campo: 'discount' | 'received'): void {
    const controle = this.form.controls[campo];
    const numero = textoParaNumero(controle.value);
    if (numero !== null && numero >= 0) controle.setValue(numeroParaTexto(numero));
  }

  // ================= Validação e envio =================

  invalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  mensagem(campo: string): string {
    const e = this.form.get(campo)?.errors;
    if (!e) return '';
    if (e['required']) return 'Campo obrigatório.';
    if (e['negativo']) return 'O valor não pode ser negativo.';
    if (e['dinheiro']) return 'Informe um valor válido, ex.: R$ 12,50.';
    if (e['cpf']) return 'O CPF precisa ter 11 dígitos.';
    if (e['telefone']) return 'Informe DDD + número, ex.: (11) 90000-0000.';
    return 'Valor inválido.';
  }

  finalizar(): void {
    this.erro.set(null);
    const vazia = this.linhas().length === 0;
    this.semItens.set(vazia);

    if (this.form.invalid || vazia || this.descontoMaiorQueSubtotal) {
      this.form.markAllAsTouched();
      if (vazia) this.erro.set('Adicione pelo menos 1 item para finalizar a venda.');
      else if (this.descontoMaiorQueSubtotal) this.erro.set('O desconto não pode ser maior que o subtotal dos itens.');
      return;
    }
    if (this.ehDinheiro && this.troco !== null && this.troco < 0) {
      this.erro.set('O valor recebido em dinheiro é menor que o total da venda.');
      return;
    }

    const v = this.form.getRawValue();
    const texto = (s: string) => (s.trim() === '' ? null : s.trim());
    const corpo: NovaVenda = {
      clientName: texto(v.clientName),
      clientPhone: texto(v.clientPhone),
      clientCpf: texto(v.clientCpf.replace(/\D/g, '')),
      paymentMethod: v.paymentMethod as FormaPagamento,
      installments: this.ehCredito ? Number(v.installments) : 1,
      discount: this.desconto,
      observations: texto(v.observations),
      items: this.linhas().map((l) => ({ itemId: l.item.id, quantity: l.quantidade }))
    };

    this.enviando.set(true);
    this.vendas.registrar(corpo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigate([this.voltarPara()]);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.tratarErro(e);
      }
    });
  }

  private tratarErro(e: HttpErrorResponse): void {
    if (e.status === 409) {
      // Outro usuário vendeu o item enquanto esta venda era montada
      this.erro.set('Algum item não tem mais estoque suficiente. O estoque foi atualizado; revise as quantidades.');
      this.carregarEstoque();
      return;
    }
    if (e.status === 400) {
      this.erro.set('Revise os campos: o servidor recusou os dados da venda.');
      return;
    }
    if (e.status === 404) {
      this.erro.set('Algum item da venda não existe mais no estoque. Remova-o e tente novamente.');
      this.carregarEstoque();
      return;
    }
    this.erro.set(this.mensagemHttp(e, 'finalizar a venda'));
  }

  private mensagemHttp(e: HttpErrorResponse, acao: string): string {
    switch (e.status) {
      case 401:
      case 403:
        return 'Sem permissão. Faça login novamente.';
      case 0:
        return 'Não foi possível falar com o servidor. Confira se a API está no ar.';
      default:
        return `Não foi possível ${acao}. Tente novamente.`;
    }
  }
}
