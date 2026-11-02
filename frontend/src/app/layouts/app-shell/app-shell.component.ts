import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SessionService } from '../../services/session.service';

interface ItemMenu {
  id: string;
  label: string;
  path: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private session = inject(SessionService);
  private readonly router = inject(Router);

  // 1. O utilizador logado vem direto do SessionService
  readonly user = this.session.user;

  // 2. Reatividade Total: Tudo se baseia no utilizador real em memória (Signal Computed)
  readonly ehAdministrador = computed(() => this.user()?.role === 'ADMINISTRATOR');
  
  readonly rotuloMenu = computed(() => this.ehAdministrador() ? 'Gestão da oficina' : 'Operação da oficina');
  readonly rotuloArea = computed(() => this.ehAdministrador() ? 'Painel administrativo' : 'Área operacional');

  // 3. Monta o menu dinamicamente observando o perfil
  readonly menu = computed<ItemMenu[]>(() => {
    const admin = this.ehAdministrador();
    const basePath = admin ? 'administrador' : 'funcionario';
    
    const itens: ItemMenu[] = [
      { id: 'home', label: 'Home', path: 'home' },
      { id: 'estoque', label: 'Estoque', path: 'estoque' },
      { id: 'servicos', label: 'Serviços', path: 'servicos' },
      { id: 'vendas', label: 'Vendas', path: 'vendas' },
    ];

    if (admin) {
      itens.push({ id: 'funcionarios/novo', label: 'Funcionários', path: 'funcionarios/novo' });
    }

    return itens.map(item => ({ ...item, path: `/${basePath}/${item.path}` }));
  });

  readonly iniciais = computed(() => {
    const nome = this.user()?.name;
    if (!nome) return '';
    return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  });

  readonly dataHoje = this.formatarData(new Date());

  // Lê a URL do navegador automaticamente
  private url = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // Monta o Breadcrumb (título no cabeçalho)
  readonly currentLabel = computed(() => {
    const partes = this.url().split('/');
    const secao = partes[2]?.split(/[?#]/)[0] ?? 'home'; 
    const itemMenu = this.menu().find(item => item.id === secao);
    const label = itemMenu ? itemMenu.label : '';

    const subRota = partes[3]?.split(/[?#]/)[0];
    return subRota ? `${label} / Detalhes` : label;
  });

  private formatarData(data: Date): string {
    const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  
  constructor() {
    this.session.load().subscribe();
  }
}