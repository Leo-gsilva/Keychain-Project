import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Funcionario, FuncionarioService, Genero } from '../../../services/funcionario.service';

const ROTULO_GENERO: Record<Genero, string> = {
  MASCULINE: 'Masculino',
  FEMININE: 'Feminino',
  OTHERS: 'Outro'
};

// Tira acentos e deixa minúsculo, para a busca achar "jose" em "José"
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-funcionarios',
  host: {class: 'listagem'}, // estilos comuns das listagens: src/styles/_listagem.scss
  imports: [RouterLink],
  templateUrl: './funcionarios.component.html',
  styleUrl: './funcionarios.component.scss'
})
export class FuncionariosComponent implements OnInit {
  private readonly servico = inject(FuncionarioService);

  readonly funcionarios = signal<Funcionario[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly busca = signal('');

  // ---------- Tabela: busca e contagens ----------
  /** Filtra pelos mesmos campos citados no campo de busca: nome, email e CPF. */
  readonly filtrados = computed(() => {
    const termo = normalizar(this.busca());
    if (!termo) return this.funcionarios();

    return this.funcionarios().filter((funcionario) =>
      normalizar(`${funcionario.name} ${funcionario.email} ${funcionario.cpf}`).includes(termo)
    );
  });

  readonly contagem = computed(() => {
    const total = this.funcionarios().length;
    return `${total} ${total === 1 ? 'funcionário cadastrado' : 'funcionários cadastrados'}`;
  });

  readonly registros = computed(() => {
    const total = this.filtrados().length;
    return total === 0 ? 'Mostrando 0 de 0 registros' : `Mostrando 1–${total} de ${total} registros`;
  });

  readonly mensagemVazia = computed(() => {
    if (this.carregando()) return 'Carregando funcionários…';
    if (this.funcionarios().length === 0) {
      return this.erro()
        ? 'Não foi possível exibir os funcionários.'
        : 'Nenhum funcionário cadastrado ainda. Use o botão Cadastrar funcionário para cadastrar o primeiro.';
    }
    return 'Nenhum funcionário encontrado para essa busca.';
  });

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    this.servico.listar().subscribe({
      next: (lista) => {
        const ordenada = [...lista].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        this.funcionarios.set(ordenada);
        this.erro.set(null);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 401) this.erro.set('Você precisa estar logado para ver os funcionários.');
        else if (e.status === 403) this.erro.set('Sua conta não tem permissão para ver os funcionários.');
        else if (e.status === 0) this.erro.set('Não foi possível conectar ao back-end. Verifique se ele está rodando.');
        else this.erro.set('Não foi possível carregar os funcionários agora.');
        this.carregando.set(false);
      }
    });
  }

  // ---------- Eventos da tela ----------
  aoBuscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  excluir(funcionario: Funcionario): void {
    if (!confirm(`Excluir o funcionário \"${funcionario.name}\"? Essa ação não pode ser desfeita.`)) return;

    this.servico.excluir(funcionario.id).subscribe({
      next: () => {
        this.funcionarios.update((lista) => lista.filter((f) => f.id !== funcionario.id));
        this.erro.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(
          e.status === 403
            ? 'Só é possível excluir contas de funcionários.'
            : 'Não foi possível excluir o funcionário.'
        );
      }
    });
  }

  // ---------- Formatação ----------
  rotuloGenero(genero: Genero): string {
    const chave = String(genero ?? '').trim().toUpperCase() as Genero;
    return ROTULO_GENERO[chave] ?? '—';
  }

  /** O backend guarda o CPF só com números. */
  cpf(valor: string): string {
    const digitos = String(valor ?? '').replace(/\D/g, '');
    if (digitos.length !== 11) return valor || '—';
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /** Data no formato AAAA-MM-DD (ou ISO completo) para DD/MM/AAAA do design. */
  data(valor: string): string {
    const somenteData = String(valor ?? '').split('T')[0];
    const [ano, mes, dia] = somenteData.split('-');
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—';
  }
  
}
