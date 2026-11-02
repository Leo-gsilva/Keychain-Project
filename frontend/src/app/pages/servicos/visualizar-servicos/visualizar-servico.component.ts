import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {forkJoin} from 'rxjs';

import {AnexoServico, Servico, ServicoService} from '../../../services/servico.service';
import {numeroParaTexto} from '../../../utils/dinheiro';
import {
  FORMAS_PAGAMENTO,
  LOCAIS_ATENDIMENTO,
  baixarBlob,
  dataBr,
  ehImagem,
  extrairExtensao,
  formatarTamanho,
  numeroOrdem
} from '../../../utils/servico-formulario';
import {STATUS_SERVICO, TIPOS_SERVICO} from '../../../utils/servico-rotulos';

interface AnexoVisual extends AnexoServico {
  extensao: string;
  previewUrl?: string;
}

@Component({
  selector: 'app-visualizar-servico',
  imports: [RouterLink],
  templateUrl: './visualizar-servico.component.html',
  styleUrl: './visualizar-servico.component.scss'
})
export class VisualizarServicoComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicos = inject(ServicoService);

  readonly id = Number(this.route.snapshot.paramMap.get('id'));

  readonly servico = signal<Servico | null>(null);
  readonly anexos = signal<AnexoVisual[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly baixandoId = signal<number | null>(null);

  readonly fotos = computed(() => this.anexos().filter((a) => ehImagem(a.contentType, a.fileName)));
  readonly documentos = computed(() => this.anexos().filter((a) => !ehImagem(a.contentType, a.fileName)));

  /** Texto da faixa abaixo dos valores, conforme o que já foi pago. */
  readonly avisoPagamento = computed(() => {
    const s = this.servico();
    if (!s) return '';
    const total = Number(s.serviceValue);
    const pago = Number(s.paidValue);

    if (pago <= 0) return 'Pagamento ainda não recebido do cliente.';
    if (pago < total) return `Pagamento parcial recebido. Falta receber ${numeroParaTexto(total - pago)}.`;
    return 'Pagamento recebido integralmente.';
  });

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
        this.servico.set(servico);
        this.anexos.set(anexos.map((a) => ({...a, extensao: extrairExtensao(a.fileName).toUpperCase()})));
        this.carregando.set(false);
        this.carregarMiniaturas();
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
    for (const anexo of this.anexos()) {
      if (anexo.previewUrl) URL.revokeObjectURL(anexo.previewUrl);
    }
  }

  // As imagens vêm de uma rota autenticada, então não dá para usar o link direto no <img>.
  // Baixa o arquivo pelo HttpClient (com o token) e mostra por um endereço local.
  private carregarMiniaturas(): void {
    for (const foto of this.fotos()) {
      this.servicos.baixarAnexo(this.id, foto.id).subscribe({
        next: (blob) => {
          const previewUrl = URL.createObjectURL(blob);
          this.anexos.update((lista) => lista.map((a) => (a.id === foto.id ? {...a, previewUrl} : a)));
        },
        error: () => {
          /* sem miniatura: o cartão continua mostrando o nome do arquivo */
        }
      });
    }
  }

  baixarDocumento(anexo: AnexoVisual): void {
    this.baixandoId.set(anexo.id);
    this.servicos.baixarAnexo(this.id, anexo.id).subscribe({
      next: (blob) => {
        baixarBlob(blob, anexo.fileName);
        this.baixandoId.set(null);
      },
      error: () => {
        this.erro.set(`Não foi possível baixar "${anexo.fileName}".`);
        this.baixandoId.set(null);
      }
    });
  }

  // ---------- Navegação (funciona em /funcionario e em /administrador) ----------
  private get base(): string {
    return this.router.url.startsWith('/administrador') ? '/administrador' : '/funcionario';
  }

  get linkListagem(): string[] {
    return [this.base, 'servicos'];
  }

  get linkEdicao(): string[] {
    return [this.base, 'servicos', String(this.id), 'editar'];
  }

  // ---------- Regras de exibição ----------
  get numero(): string {
    return numeroOrdem(this.id);
  }

  nomeTipo(valor: string): string {
    return TIPOS_SERVICO.find((t) => t.valor === valor)?.nome ?? '—';
  }

  nomeStatus(valor: string): string {
    return STATUS_SERVICO.find((s) => s.valor === valor)?.nome ?? '—';
  }

  nomeLocal(valor: string): string {
    return LOCAIS_ATENDIMENTO.find((l) => l.valor === valor)?.nome ?? '—';
  }

  nomeFormaPagamento(valor: string): string {
    return FORMAS_PAGAMENTO.find((f) => f.valor === valor)?.nome ?? '—';
  }

  data(iso: string): string {
    return dataBr(iso);
  }

  moeda(valor: number): string {
    return numeroParaTexto(Number(valor));
  }

  tamanho(bytes: number): string {
    return formatarTamanho(bytes);
  }

  /** CPF/CNPJ vem do backend só com números; exibe com pontuação. */
  documentoFormatado(valor: string | null): string {
    const d = (valor ?? '').replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    return valor?.trim() || '—';
  }
}
