import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ItemRequest, ItemService } from '../../../services/item.service';
import { numeroParaTexto, textoParaNumero } from '../../../utils/dinheiro';

function dinheiroValido(controle: AbstractControl): ValidationErrors | null {
  const texto = String(controle.value ?? '').trim();
  if (texto === '') return null;
  const numero = textoParaNumero(texto);
  if (numero === null) return { dinheiro: true };
  return numero < 0 ? { negativo: true } : null;
}

@Component({
  selector: 'app-funcionario-cadastro-item',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './funcionario-cadastro-item.component.html',
  styleUrl: './funcionario-cadastro-item.component.scss'
})
export class FuncionarioCadastroItemComponent {
  private readonly fb = inject(FormBuilder);
  private readonly itens = inject(ItemService);
  private readonly router = inject(Router);

  // TODO: o backend ainda não guarda a categoria nem expõe a lista
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

  // TODO: o backend ainda não tem o campo "unidade"
  readonly unidades = [
    { valor: 'UN', nome: 'Unidade (un.)' },
    { valor: 'PAR', nome: 'Par' },
    { valor: 'CX', nome: 'Caixa (cx.)' },
    { valor: 'PCT', nome: 'Pacote (pct.)' },
    { valor: 'M', nome: 'Metro (m)' }
  ];

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    idCode: ['', [Validators.required]],
    category: ['', [Validators.required]],
    brand: [''],
    unit: ['UN', [Validators.required]],
    unitValue: ['', [Validators.required, dinheiroValido]],
    costPrice: ['', [Validators.required, dinheiroValido]],
    sellPrice: ['', [Validators.required, dinheiroValido]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    minStock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    description: ['']
  });

  invalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  mensagem(campo: string): string {
    const e = this.form.get(campo)?.errors;
    if (!e) return '';
    if (e['required']) return 'Campo obrigatório.';
    if (e['negativo'] || e['min']) return 'O valor não pode ser negativo.';
    if (e['dinheiro']) return 'Informe um valor válido, ex.: R$ 12,50.';
    if (e['pattern']) return 'Informe um número inteiro.';
    if (e['conflito']) return 'Já existe um item com esse código.';
    return 'Valor inválido.';
  }

  formatarDinheiro(campo: 'unitValue' | 'costPrice' | 'sellPrice'): void {
    const controle = this.form.controls[campo];
    const numero = textoParaNumero(controle.value);
    if (numero !== null && numero >= 0) controle.setValue(numeroParaTexto(numero));
  }

  salvar(): void {
    this.erro.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const corpo: ItemRequest = {
      idCode: v.idCode.trim(),
      name: v.name.trim(),
      brand: v.brand.trim(),
      description: v.description.trim(),
      costPrice: textoParaNumero(v.costPrice)!,
      sellPrice: textoParaNumero(v.sellPrice)!,
      stock: Number(v.stock),
      minStock: Number(v.minStock)
      // TODO: enviar quando o backend aceitar:
      // category: v.category,
      // unit: v.unit,
    };

    this.enviando.set(true);
    this.itens.cadastrar(corpo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigate(['/funcionario/estoque']);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.tratarErro(e);
      }
    });
  }

  private tratarErro(e: HttpErrorResponse): void {
    switch (e.status) {
      case 409:
        this.form.controls.idCode.setErrors({ conflito: true });
        this.form.controls.idCode.markAsTouched();
        this.erro.set('Já existe um item cadastrado com esse código de identificação.');
        break;
      case 400:
        this.erro.set('Revise os campos: o servidor recusou os dados (a marca é obrigatória no backend).');
        break;
      case 401:
      case 403:
        this.erro.set('Sem permissão para cadastrar. Faça login novamente.');
        break;
      case 0:
        this.erro.set('Não foi possível falar com o servidor. Confira se a API está no ar.');
        break;
      default:
        this.erro.set('Não foi possível salvar o item. Tente novamente.');
    }
  }
}