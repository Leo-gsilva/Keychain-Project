import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';

import {
  FormaPagamentoServico,
  LocalServico,
  Servico,
  ServicoRequest,
  ServicoService,
  StatusServico,
  TipoServico
} from '../../../services/servico.service';
import { numeroParaTexto, textoParaNumero } from '../../../utils/dinheiro';

const EXTENSOES_FOTO = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic']);
const EXTENSOES_DOCUMENTO = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']);
const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB
const LIMITE_ARQUIVOS = 20;

export interface ArquivoSelecionado {
  id: string;
  arquivo: File;
  nome: string;
  tamanho: number;
  extensao: string;
  previewUrl?: string;
}

function dinheiroValido(controle: AbstractControl): ValidationErrors | null {
  const texto = String(controle.value ?? '').trim();
  if (texto === '') return null;
  const numero = textoParaNumero(texto);
  if (numero === null) return { dinheiro: true };
  return numero < 0 ? { negativo: true } : null;
}

/** Telefone obrigatório no formato (00) 0000-0000 ou (00) 90000-0000 exigido pelo backend. */
function telefoneValido(controle: AbstractControl): ValidationErrors | null {
  const texto = String(controle.value ?? '').trim();
  if (texto === '') return null;
  return /^\([0-9]{2}\) 9?[0-9]{4}-[0-9]{4}$/.test(texto) ? null : { telefone: true };
}

/** Opcional, mas se preenchido deve ter 11 (CPF) ou 14 (CNPJ) dígitos. */
function cpfOuCnpjValido(controle: AbstractControl): ValidationErrors | null {
  const numeros = String(controle.value ?? '').replace(/\D/g, '');
  if (numeros === '') return null;
  return numeros.length === 11 || numeros.length === 14 ? null : { documento: true };
}

@Component({
  selector: 'app-cadastrar-servico',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cadastrar-servico.component.html',
  styleUrl: './cadastrar-servico.component.scss'
})
export class CadastrarServicoComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly servicos = inject(ServicoService);
  private readonly router = inject(Router);

  readonly tiposServico: { valor: TipoServico; nome: string }[] = [
    { valor: 'KEY_COPY', nome: 'Cópia de chaves' },
    { valor: 'KEY_MAKING', nome: 'Confecção de chaves' },
    { valor: 'UNLOCK_DOOR_VEHICLE_SAFE', nome: 'Abertura de portas, veículos ou cofres' },
    { valor: 'REPLACE_INSTALL_LOCK_CYLINDER', nome: 'Troca de cilindro / instalação de fechaduras' },
    { valor: 'LOCK_REPAIR', nome: 'Conserto de fechaduras' },
    { valor: 'AUTOMOTIVE_KEY_PROGRAMMING', nome: 'Cópia ou programação de chaves automotivas' },
    { valor: 'DIGITAL_LOCK_INSTALLATION_MAINTENANCE', nome: 'Instalação e manutenção de fechaduras digitais' },
    { valor: 'OTHER', nome: 'Outro' }
  ];

  readonly statusOpcoes: { valor: StatusServico; nome: string }[] = [
    { valor: 'PENDING', nome: 'Aguardando' },
    { valor: 'IN_PROGRESS', nome: 'Em execução' },
    { valor: 'COMPLETED', nome: 'Concluído' },
    { valor: 'CANCELED', nome: 'Cancelado' }
  ];

  readonly locaisAtendimento: { valor: LocalServico; nome: string }[] = [
    { valor: 'STORE', nome: 'Oficina / Balcão' },
    { valor: 'ON_SITE', nome: 'Atendimento externo' }
  ];

  readonly formasPagamento: { valor: FormaPagamentoServico; nome: string }[] = [
    { valor: 'TO_BE_DEFINED', nome: 'A definir' },
    { valor: 'PIX', nome: 'Pix' },
    { valor: 'CASH', nome: 'Dinheiro' },
    { valor: 'DEBIT_CARD', nome: 'Cartão de débito' },
    { valor: 'CREDIT_CARD', nome: 'Cartão de crédito' }
  ];

  readonly form = this.fb.nonNullable.group({
    clientName: ['', [Validators.required]],
    clientPhone: ['', [Validators.required, telefoneValido]],
    clientCpfCnpj: ['', [cpfOuCnpjValido]],
    serviceType: this.fb.nonNullable.control<TipoServico | ''>('', [Validators.required]),
    hiringDate: ['', [Validators.required]],
    status: this.fb.nonNullable.control<StatusServico>('PENDING', [Validators.required]),
    observations: [''],
    location: this.fb.nonNullable.control<LocalServico | ''>('', [Validators.required]),
    address: [''],
    serviceValue: ['R$ 0,00', [Validators.required, dinheiroValido]],
    paidValue: ['R$ 0,00', [Validators.required, dinheiroValido]],
    paymentMethod: this.fb.nonNullable.control<FormaPagamentoServico | ''>('', [Validators.required])
  });

  readonly fotos = signal<ArquivoSelecionado[]>([]);
  readonly documentos = signal<ArquivoSelecionado[]>([]);
  readonly arrastandoFoto = signal(false);
  readonly arrastandoDocumento = signal(false);
  readonly erroAnexo = signal<string | null>(null);

  readonly totalAnexos = computed(() => this.fotos().length + this.documentos().length);
  readonly tamanhoTotalAnexos = computed(() =>
    [...this.fotos(), ...this.documentos()].reduce((soma, item) => soma + item.tamanho, 0)
  );

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);

  constructor() {
    this.form.controls.location.valueChanges.subscribe((local) => {
      const endereco = this.form.controls.address;
      if (local === 'ON_SITE') {
        endereco.setValidators([Validators.required]);
      } else {
        endereco.clearValidators();
      }
      endereco.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    for (const foto of this.fotos()) {
      if (foto.previewUrl) URL.revokeObjectURL(foto.previewUrl);
    }
  }

  get ehAtendimentoExterno(): boolean {
    return this.form.controls.location.value === 'ON_SITE';
  }

  invalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  mensagem(campo: string): string {
    const e = this.form.get(campo)?.errors;
    if (!e) return '';
    if (e['required']) {
      return campo === 'address'
        ? 'Informe o endereço para atendimento externo.'
        : 'Campo obrigatório.';
    }
    if (e['telefone']) return 'Informe o telefone no formato (00) 00000-0000.';
    if (e['documento']) return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    if (e['negativo']) return 'O valor não pode ser negativo.';
    if (e['dinheiro']) return 'Informe um valor válido, ex.: R$ 180,00.';
    return 'Valor inválido.';
  }

  formatarTelefone(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 11);
    let formatado = '';

    if (digitos.length > 0) {
      formatado = '(' + digitos.slice(0, 2);
    }
    if (digitos.length >= 3) {
      formatado += ') ';
      if (digitos.length <= 10) {
        formatado += digitos.slice(2, 6);
        if (digitos.length > 6) formatado += '-' + digitos.slice(6, 10);
      } else {
        formatado += digitos.slice(2, 7) + '-' + digitos.slice(7, 11);
      }
    }

    this.form.controls.clientPhone.setValue(formatado, { emitEvent: false });
    input.value = formatado;
  }

  formatarDocumento(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 14);
    let formatado = digitos;

    if (digitos.length <= 11) {
      if (digitos.length > 9) {
        formatado = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
      } else if (digitos.length > 6) {
        formatado = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
      } else if (digitos.length > 3) {
        formatado = `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
      }
    } else {
      if (digitos.length > 12) {
        formatado = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
      } else if (digitos.length > 8) {
        formatado = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;
      } else if (digitos.length > 5) {
        formatado = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
      } else if (digitos.length > 2) {
        formatado = `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
      }
    }

    this.form.controls.clientCpfCnpj.setValue(formatado, { emitEvent: false });
    input.value = formatado;
  }

  formatarDinheiro(campo: 'serviceValue' | 'paidValue'): void {
    const controle = this.form.controls[campo];
    const texto = controle.value.trim();
    if (texto === '') {
      controle.setValue('R$ 0,00');
      return;
    }
    const numero = textoParaNumero(texto);
    if (numero !== null && numero >= 0) {
      controle.setValue(numeroParaTexto(numero));
    }
  }

  // ================= Anexos (Fotos e Documentos) =================

  aoSelecionarFotos(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (input.files?.length) {
      this.adicionarArquivos(Array.from(input.files), 'foto');
      input.value = '';
    }
  }

  aoSelecionarDocumentos(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (input.files?.length) {
      this.adicionarArquivos(Array.from(input.files), 'documento');
      input.value = '';
    }
  }

  aoArrastarSobre(evento: DragEvent, tipo: 'foto' | 'documento'): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (tipo === 'foto') this.arrastandoFoto.set(true);
    else this.arrastandoDocumento.set(true);
  }

  aoSairArraste(evento: DragEvent, tipo: 'foto' | 'documento'): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (tipo === 'foto') this.arrastandoFoto.set(false);
    else this.arrastandoDocumento.set(false);
  }

  aoSoltarArquivos(evento: DragEvent, tipo: 'foto' | 'documento'): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (tipo === 'foto') this.arrastandoFoto.set(false);
    else this.arrastandoDocumento.set(false);

    const arquivos = evento.dataTransfer?.files;
    if (arquivos?.length) {
      this.adicionarArquivos(Array.from(arquivos), tipo);
    }
  }

  private adicionarArquivos(arquivos: File[], tipo: 'foto' | 'documento'): void {
    this.erroAnexo.set(null);

    if (this.totalAnexos() + arquivos.length > LIMITE_ARQUIVOS) {
      this.erroAnexo.set(`Cada serviço pode ter no máximo ${LIMITE_ARQUIVOS} arquivos anexados.`);
      return;
    }

    const permitidas = tipo === 'foto' ? EXTENSOES_FOTO : EXTENSOES_DOCUMENTO;
    const novos: ArquivoSelecionado[] = [];

    for (const arquivo of arquivos) {
      const ext = this.extrairExtensao(arquivo.name);
      if (!permitidas.has(ext)) {
        this.erroAnexo.set(
          tipo === 'foto'
            ? `Formato não suportado em "${arquivo.name}". Use PNG, JPG ou WEBP.`
            : `Formato não suportado em "${arquivo.name}". Use PDF, DOCX ou XLSX.`
        );
        return;
      }
      if (arquivo.size <= 0) {
        this.erroAnexo.set(`O arquivo "${arquivo.name}" está vazio.`);
        return;
      }
      if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
        this.erroAnexo.set(`O arquivo "${arquivo.name}" ultrapassa o limite de 20 MB.`);
        return;
      }

      novos.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        arquivo,
        nome: arquivo.name,
        tamanho: arquivo.size,
        extensao: ext.toUpperCase(),
        previewUrl: tipo === 'foto' ? URL.createObjectURL(arquivo) : undefined
      });
    }

    if (tipo === 'foto') {
      this.fotos.update((atuais) => [...atuais, ...novos]);
    } else {
      this.documentos.update((atuais) => [...atuais, ...novos]);
    }
  }

  removerFoto(id: string): void {
    const alvo = this.fotos().find((f) => f.id === id);
    if (alvo?.previewUrl) URL.revokeObjectURL(alvo.previewUrl);
    this.fotos.update((atuais) => atuais.filter((f) => f.id !== id));
  }

  removerDocumento(id: string): void {
    this.documentos.update((atuais) => atuais.filter((d) => d.id !== id));
  }

  baixarDocumentoLocal(doc: ArquivoSelecionado): void {
    const url = URL.createObjectURL(doc.arquivo);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.nome;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  formatarTamanho(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1).replace('.', ',')} MB`;
  }

  private extrairExtensao(nomeArquivo: string): string {
    const ponto = nomeArquivo.lastIndexOf('.');
    return ponto < 0 ? '' : nomeArquivo.slice(ponto + 1).toLowerCase();
  }

  // ================= Salvar serviço =================

  salvar(): void {
    this.erro.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const valorServico = textoParaNumero(v.serviceValue);
    const valorPago = textoParaNumero(v.paidValue);

    if (valorServico === null || valorPago === null) {
      this.form.markAllAsTouched();
      return;
    }

    const textoOpcional = (s: string) => (s.trim() === '' ? null : s.trim());

    const corpo: ServicoRequest = {
      clientName: v.clientName.trim(),
      clientPhone: v.clientPhone.trim(),
      clientCpfCnpj: textoOpcional(v.clientCpfCnpj),
      serviceType: v.serviceType as TipoServico,
      hiringDate: v.hiringDate,
      observations: textoOpcional(v.observations),
      location: v.location as LocalServico,
      address: v.location === 'ON_SITE' ? textoOpcional(v.address) : textoOpcional(v.address),
      serviceValue: valorServico,
      paidValue: valorPago,
      paymentMethod: v.paymentMethod as FormaPagamentoServico
    };

    const todosArquivos = [...this.fotos(), ...this.documentos()].map((item) => item.arquivo);
    const statusEscolhido = v.status;

    this.enviando.set(true);

    this.servicos
      .cadastrar(corpo)
      .pipe(
        switchMap((criado: Servico): Observable<Servico> => {
          if (statusEscolhido && statusEscolhido !== 'PENDING') {
            return this.servicos.alterarStatus(criado.id, statusEscolhido);
          }
          return of(criado);
        }),
        switchMap((servicoAtualizado: Servico) => {
          if (todosArquivos.length > 0) {
            return this.servicos.enviarAnexos(servicoAtualizado.id, todosArquivos);
          }
          return of([]);
        })
      )
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.router.navigate(['/funcionario/servicos']);
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.tratarErro(e);
        }
      });
  }

  private tratarErro(e: HttpErrorResponse): void {
    switch (e.status) {
      case 400:
        this.erro.set('Revise os campos preenchidos: o servidor recusou os dados enviados.');
        break;
      case 401:
      case 403:
        this.erro.set('Sem permissão para cadastrar o serviço. Faça login novamente.');
        break;
      case 413:
        this.erro.set('Os anexos ultrapassam o tamanho máximo permitido pelo servidor (20 MB).');
        break;
      case 0:
        this.erro.set('Não foi possível falar com o servidor. Confira se a API está no ar.');
        break;
      default:
        this.erro.set('Não foi possível salvar o serviço. Tente novamente.');
    }
  }
}

