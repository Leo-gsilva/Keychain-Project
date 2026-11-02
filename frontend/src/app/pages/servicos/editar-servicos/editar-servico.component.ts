import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Observable, forkJoin, of, switchMap, tap} from 'rxjs';

import {
  FormaPagamentoServico,
  LocalServico,
  Servico,
  ServicoRequest,
  ServicoService,
  StatusServico,
  TipoServico
} from '../../../services/servico.service';
import {numeroParaTexto, textoParaNumero} from '../../../utils/dinheiro';
import {
  EXTENSOES_DOCUMENTO,
  EXTENSOES_FOTO,
  FORMAS_PAGAMENTO,
  LIMITE_ARQUIVOS,
  LOCAIS_ATENDIMENTO,
  TAMANHO_MAXIMO_BYTES,
  baixarBlob,
  cpfOuCnpjValido,
  dinheiroValido,
  ehImagem,
  extrairExtensao,
  formatarTamanho,
  mascararDocumento,
  mascararTelefone,
  numeroOrdem,
  telefoneValido
} from '../../../utils/servico-formulario';
import {STATUS_SERVICO, TIPOS_SERVICO} from '../../../utils/servico-rotulos';

type TipoAnexo = 'foto' | 'documento';

/** Anexo exibido na tela: ou já está no servidor (anexoId) ou foi escolhido agora (arquivo). */
export interface AnexoEditavel {
  chave: string;
  anexoId?: number;
  arquivo?: File;
  nome: string;
  tamanho: number;
  extensao: string;
  previewUrl?: string;
}

@Component({
  selector: 'app-editar-servico',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './editar-servico.component.html',
  styleUrl: './editar-servico.component.scss'
})
export class EditarServicoComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicos = inject(ServicoService);

  readonly id = Number(this.route.snapshot.paramMap.get('id'));

  readonly tiposServico = TIPOS_SERVICO;
  readonly statusOpcoes = STATUS_SERVICO;
  readonly locaisAtendimento = LOCAIS_ATENDIMENTO;
  readonly formasPagamento = FORMAS_PAGAMENTO;

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

  readonly original = signal<Servico | null>(null);

  readonly carregando = signal(true);
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);

  // ---------- Anexos ----------
  readonly fotos = signal<AnexoEditavel[]>([]);
  readonly documentos = signal<AnexoEditavel[]>([]);
  /** Anexos que já estão no servidor e serão excluídos ao salvar. */
  private readonly removidos = signal<number[]>([]);

  readonly arrastandoFoto = signal(false);
  readonly arrastandoDocumento = signal(false);
  readonly erroAnexo = signal<string | null>(null);

  readonly totalAnexos = computed(() => this.fotos().length + this.documentos().length);
  readonly novosAnexos = computed(
    () => [...this.fotos(), ...this.documentos()].filter((a) => a.arquivo).length
  );
  readonly alteracoesPendentes = computed(() => this.novosAnexos() + this.removidos().length);

  constructor() {
    // Endereço só é obrigatório quando o atendimento é externo
    this.form.controls.location.valueChanges.subscribe((local) => {
      const endereco = this.form.controls.address;
      if (local === 'ON_SITE') endereco.setValidators([Validators.required]);
      else endereco.clearValidators();
      endereco.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    if (!Number.isFinite(this.id)) {
      this.erro.set('Serviço inválido.');
      this.carregando.set(false);
      return;
    }

    forkJoin({
      servico: this.servicos.buscarPorId(this.id),
      anexos: this.servicos.listarAnexos(this.id)
    }).subscribe({
      next: ({servico, anexos}) => {
        this.original.set(servico);
        this.preencherFormulario(servico);

        const fotos: AnexoEditavel[] = [];
        const documentos: AnexoEditavel[] = [];
        for (const a of anexos) {
          const item: AnexoEditavel = {
            chave: `servidor-${a.id}`,
            anexoId: a.id,
            nome: a.fileName,
            tamanho: a.size,
            extensao: extrairExtensao(a.fileName).toUpperCase()
          };
          (ehImagem(a.contentType, a.fileName) ? fotos : documentos).push(item);
        }
        this.fotos.set(fotos);
        this.documentos.set(documentos);
        this.carregando.set(false);
        this.carregarMiniaturas(fotos);
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(
          e.status === 404
            ? 'Esse serviço não existe mais.'
            : e.status === 0
              ? 'Não foi possível falar com o servidor. Confira se a API está no ar.'
              : 'Não foi possível carregar o serviço agora.'
        );
        this.carregando.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    for (const foto of this.fotos()) {
      if (foto.previewUrl) URL.revokeObjectURL(foto.previewUrl);
    }
  }

  private preencherFormulario(s: Servico): void {
    this.form.reset({
      clientName: s.clientName,
      clientPhone: s.clientPhone,
      clientCpfCnpj: mascararDocumento(s.clientCpfCnpj ?? ''),
      serviceType: s.serviceType,
      hiringDate: s.hiringDate,
      status: s.status,
      observations: s.observations ?? '',
      location: s.location,
      address: s.address ?? '',
      serviceValue: numeroParaTexto(Number(s.serviceValue)),
      paidValue: numeroParaTexto(Number(s.paidValue)),
      paymentMethod: s.paymentMethod
    });
  }

  // As imagens vêm de uma rota autenticada: baixa pelo HttpClient e mostra por um endereço local.
  private carregarMiniaturas(fotos: AnexoEditavel[]): void {
    for (const foto of fotos) {
      if (foto.anexoId === undefined) continue;
      this.servicos.baixarAnexo(this.id, foto.anexoId).subscribe({
        next: (blob) => {
          const previewUrl = URL.createObjectURL(blob);
          this.fotos.update((lista) => lista.map((f) => (f.chave === foto.chave ? {...f, previewUrl} : f)));
        },
        error: () => {
          /* sem miniatura: o cartão continua mostrando o nome do arquivo */
        }
      });
    }
  }

  // ---------- Navegação ----------
  private get base(): string {
    return this.router.url.startsWith('/administrador') ? '/administrador' : '/funcionario';
  }

  get linkVisualizacao(): string[] {
    return [this.base, 'servicos', String(this.id)];
  }

  get linkListagem(): string[] {
    return [this.base, 'servicos'];
  }

  get numero(): string {
    return numeroOrdem(this.id);
  }

  // ---------- Formulário ----------
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
      return campo === 'address' ? 'Informe o endereço para atendimento externo.' : 'Campo obrigatório.';
    }
    if (e['telefone']) return 'Informe o telefone no formato (00) 00000-0000.';
    if (e['documento']) return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    if (e['negativo']) return 'O valor não pode ser negativo.';
    if (e['dinheiro']) return 'Informe um valor válido, ex.: R$ 180,00.';
    return 'Valor inválido.';
  }

  formatarTelefone(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const formatado = mascararTelefone(input.value);
    this.form.controls.clientPhone.setValue(formatado, {emitEvent: false});
    input.value = formatado;
  }

  formatarDocumento(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const formatado = mascararDocumento(input.value);
    this.form.controls.clientCpfCnpj.setValue(formatado, {emitEvent: false});
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
    if (numero !== null && numero >= 0) controle.setValue(numeroParaTexto(numero));
  }

  // ================= Anexos (Fotos e Documentos) =================

  aoSelecionarFotos(evento: Event): void {
    this.aoSelecionar(evento, 'foto');
  }

  aoSelecionarDocumentos(evento: Event): void {
    this.aoSelecionar(evento, 'documento');
  }

  private aoSelecionar(evento: Event, tipo: TipoAnexo): void {
    const input = evento.target as HTMLInputElement;
    if (input.files?.length) {
      this.adicionarArquivos(Array.from(input.files), tipo);
      input.value = '';
    }
  }

  aoArrastarSobre(evento: DragEvent, tipo: TipoAnexo): void {
    evento.preventDefault();
    evento.stopPropagation();
    (tipo === 'foto' ? this.arrastandoFoto : this.arrastandoDocumento).set(true);
  }

  aoSairArraste(evento: DragEvent, tipo: TipoAnexo): void {
    evento.preventDefault();
    evento.stopPropagation();
    (tipo === 'foto' ? this.arrastandoFoto : this.arrastandoDocumento).set(false);
  }

  aoSoltarArquivos(evento: DragEvent, tipo: TipoAnexo): void {
    evento.preventDefault();
    evento.stopPropagation();
    (tipo === 'foto' ? this.arrastandoFoto : this.arrastandoDocumento).set(false);

    const arquivos = evento.dataTransfer?.files;
    if (arquivos?.length) this.adicionarArquivos(Array.from(arquivos), tipo);
  }

  private adicionarArquivos(arquivos: File[], tipo: TipoAnexo): void {
    this.erroAnexo.set(null);

    if (this.totalAnexos() + arquivos.length > LIMITE_ARQUIVOS) {
      this.erroAnexo.set(`Cada serviço pode ter no máximo ${LIMITE_ARQUIVOS} arquivos anexados.`);
      return;
    }

    const permitidas = tipo === 'foto' ? EXTENSOES_FOTO : EXTENSOES_DOCUMENTO;
    const novos: AnexoEditavel[] = [];

    for (const arquivo of arquivos) {
      const ext = extrairExtensao(arquivo.name);
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
        chave: `novo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        arquivo,
        nome: arquivo.name,
        tamanho: arquivo.size,
        extensao: ext.toUpperCase(),
        previewUrl: tipo === 'foto' ? URL.createObjectURL(arquivo) : undefined
      });
    }

    const lista = tipo === 'foto' ? this.fotos : this.documentos;
    lista.update((atuais) => [...atuais, ...novos]);
  }

  /** Tira da tela. Se já estava no servidor, só é excluído de fato ao clicar em Salvar alterações. */
  removerAnexo(item: AnexoEditavel, tipo: TipoAnexo): void {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if (item.anexoId !== undefined) {
      const anexoId = item.anexoId;
      this.removidos.update((ids) => [...ids, anexoId]);
    }
    const lista = tipo === 'foto' ? this.fotos : this.documentos;
    lista.update((atuais) => atuais.filter((a) => a.chave !== item.chave));
    this.erroAnexo.set(null);
  }

  baixarDocumento(doc: AnexoEditavel): void {
    if (doc.arquivo) {
      baixarBlob(doc.arquivo, doc.nome);
      return;
    }
    if (doc.anexoId === undefined) return;

    this.servicos.baixarAnexo(this.id, doc.anexoId).subscribe({
      next: (blob) => baixarBlob(blob, doc.nome),
      error: () => this.erroAnexo.set(`Não foi possível baixar "${doc.nome}".`)
    });
  }

  tamanho(bytes: number): string {
    return formatarTamanho(bytes);
  }

  // ================= Salvar alterações =================

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

    const opcional = (s: string) => (s.trim() === '' ? null : s.trim());

    const corpo: ServicoRequest = {
      scheduledAt: this.original()?.scheduledAt ?? null,
      clientName: v.clientName.trim(),
      clientPhone: v.clientPhone.trim(),
      clientCpfCnpj: opcional(v.clientCpfCnpj),
      serviceType: v.serviceType as TipoServico,
      hiringDate: v.hiringDate,
      observations: opcional(v.observations),
      location: v.location as LocalServico,
      address: opcional(v.address),
      serviceValue: valorServico,
      paidValue: valorPago,
      paymentMethod: v.paymentMethod as FormaPagamentoServico
    };

    const statusMudou = v.status !== this.original()?.status;
    const idsRemovidos = this.removidos();
    const novosArquivos = [...this.fotos(), ...this.documentos()]
      .map((a) => a.arquivo)
      .filter((a): a is File => !!a);

    this.enviando.set(true);

    // 1) dados  2) status (rota separada no backend)  3) exclui anexos  4) envia anexos novos
    this.servicos
      .atualizar(this.id, corpo)
      .pipe(
        switchMap((): Observable<unknown> =>
          statusMudou ? this.servicos.alterarStatus(this.id, v.status) : of(null)
        ),
        switchMap((): Observable<unknown> =>
          idsRemovidos.length > 0
            ? forkJoin(idsRemovidos.map((anexoId) => this.servicos.excluirAnexo(this.id, anexoId))).pipe(
              tap(() => this.removidos.set([]))
            )
            : of(null)
        ),
        switchMap((): Observable<unknown> =>
          novosArquivos.length > 0 ? this.servicos.enviarAnexos(this.id, novosArquivos) : of(null)
        )
      )
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.router.navigate(this.linkVisualizacao);
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
        this.erro.set('Sem permissão para editar o serviço. Faça login novamente.');
        break;
      case 404:
        this.erro.set('Esse serviço ou um dos anexos não existe mais.');
        break;
      case 409:
        this.erro.set('Estoque insuficiente para concluir o serviço. Os demais dados já foram salvos.');
        break;
      case 413:
        this.erro.set('Os anexos ultrapassam o tamanho máximo permitido pelo servidor (20 MB).');
        break;
      case 0:
        this.erro.set('Não foi possível falar com o servidor. Confira se a API está no ar.');
        break;
      default:
        this.erro.set('Não foi possível salvar as alterações. Tente novamente.');
    }
  }
}
