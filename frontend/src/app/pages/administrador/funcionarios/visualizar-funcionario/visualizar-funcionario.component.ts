import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Funcionario, FuncionarioService, Genero } from '../../../../services/funcionario.service';

const ROTULO_GENERO: Record<Genero, string> = {
  MASCULINE: 'Masculino',
  FEMININE: 'Feminino',
  OTHERS: 'Outro'
};

const ROTULO_PERFIL: Record<Funcionario['role'], string> = {
  ADMINISTRATOR: 'Administrador',
  EMPLOYEE: 'Funcionário'
};

/**
 * Vista somente leitura de um funcionário.
 * O backend não expõe GET /accounts/{id}, então a conta é localizada na listagem.
 */
@Component({
  selector: 'app-visualizar-funcionario',
  imports: [RouterLink],
  templateUrl: './visualizar-funcionario.component.html',
  styleUrl: './visualizar-funcionario.component.scss'
})
export class VisualizarFuncionarioComponent implements OnInit {
  private readonly servico = inject(FuncionarioService);
  private readonly route = inject(ActivatedRoute);

  readonly id = Number(this.route.snapshot.paramMap.get('id'));

  readonly funcionario = signal<Funcionario | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly linkListagem = ['/administrador/funcionarios'];

  get linkEdicao(): (string | number)[] {
    return ['/administrador/funcionarios', this.id, 'editar'];
  }

  ngOnInit(): void {
    if (!Number.isFinite(this.id) || this.id <= 0) {
      this.erro.set('Funcionário inválido.');
      this.carregando.set(false);
      return;
    }

    this.servico.listar().subscribe({
      next: (lista) => {
        const encontrado = lista.find((funcionario) => funcionario.id === this.id);
        if (!encontrado) {
          this.erro.set('Esse funcionário não existe mais.');
          this.carregando.set(false);
          return;
        }
        this.funcionario.set(encontrado);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 401) this.erro.set('Você precisa estar logado para ver os funcionários.');
        else if (e.status === 403) this.erro.set('Sua conta não tem permissão para ver os funcionários.');
        else if (e.status === 0) this.erro.set('Não foi possível conectar ao back-end. Verifique se ele está rodando.');
        else this.erro.set('Não foi possível carregar o funcionário agora.');
        this.carregando.set(false);
      }
    });
  }

  // ---------- Formatação ----------
  rotuloGenero(genero: Genero): string {
    const chave = String(genero ?? '').trim().toUpperCase() as Genero;
    return ROTULO_GENERO[chave] ?? '—';
  }

  rotuloPerfil(role: Funcionario['role']): string {
    return ROTULO_PERFIL[role] ?? '—';
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
