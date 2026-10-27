import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

export type Perfil = 'funcionario' | 'administrador';

interface ItemMenu {
  id: string;
  rotulo: string;
  rota: string;
  somenteAdmin?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  readonly perfil: Perfil = this.rota.snapshot.data['perfil'] ?? 'funcionario';
  readonly ehAdministrador = this.perfil === 'administrador';

  // TODO: trocar por dados reais quando o login existir
  readonly usuario = this.ehAdministrador
    ? { nome: 'Miguel Costa', rotuloPerfil: 'Administrador' }
    : { nome: 'Lucas Silva', rotuloPerfil: 'Funcionário' };

  readonly rotuloMenu = this.ehAdministrador ? 'Gestão da oficina' : 'Operação da oficina';
  readonly rotuloArea = this.ehAdministrador ? 'Painel administrativo' : 'Área operacional';

  readonly menu: ItemMenu[] = (
    [
      { id: 'home', rotulo: 'Home', rota: 'home' },
      { id: 'estoque', rotulo: 'Estoque', rota: 'estoque' },
      { id: 'servicos', rotulo: 'Serviços', rota: 'servicos' },
      { id: 'funcionarios', rotulo: 'Funcionários', rota: 'funcionarios', somenteAdmin: true }
    ] as ItemMenu[]
  )
    .filter((item) => !item.somenteAdmin || this.ehAdministrador)
    .map((item) => ({ ...item, rota: `/${this.perfil}/${item.rota}` }));

  readonly iniciais = this.usuario.nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  readonly dataHoje = this.formatarData(new Date());

  readonly trilha = signal<string[]>([]);
  readonly secaoAtiva = signal<string>('');

  constructor() {

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.atualizar());
  }

  private atualizar(): void {
    let atual = this.rota;
    while (atual.firstChild) atual = atual.firstChild;
    this.trilha.set((atual.snapshot?.data['breadcrumb'] as string[] | undefined) ?? []);
    this.secaoAtiva.set((atual.snapshot?.data['secao'] as string | undefined) ?? '');
  }

  private formatarData(data: Date): string {
    const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}