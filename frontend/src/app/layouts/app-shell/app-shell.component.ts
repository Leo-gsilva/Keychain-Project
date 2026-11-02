import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SessionService } from '../../services/session.service';

interface ItemMenu {
  id: string;
  label: string;
  path: string;
  icone: string;
}

/** Um nível do breadcrumb do cabeçalho (declarado em data.breadcrumb da rota). */
interface ItemTrilha {
  rotulo: string;
  /** Marca o nível em negrito: no design o destaque fica na seção, não na página atual. */
  destaque?: boolean;
}

/**
 * Cada item do menu tem um ícone em public/assets/icons. O SVG é aplicado como
 * máscara em .menu__icone, então a cor vem do CSS: cinza no item inativo e
 * grafite no item ativo, como no design.
 */
const ICONE_MENU: Record<string, string> = {
  home: 'assets/icons/nav-home.svg',
  estoque: 'assets/icons/nav-estoque.svg',
  servicos: 'assets/icons/nav-servicos.svg',
  vendas: 'assets/icons/nav-vendas.svg',
  funcionarios: 'assets/icons/nav-funcionarios.svg'
};

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
    
    const itens: Omit<ItemMenu, 'icone'>[] = [
      { id: 'home', label: 'Home', path: 'home' },
      { id: 'estoque', label: 'Estoque', path: 'estoque' },
      { id: 'servicos', label: 'Serviços', path: 'servicos' },
      { id: 'vendas', label: 'Vendas', path: 'vendas' },
    ];

    if (admin) {
      itens.push({ id: 'funcionarios', label: 'Funcionários', path: 'funcionarios' });
    }

    return itens.map(item => ({
      ...item,
      path: `/${basePath}/${item.path}`,
      icone: ICONE_MENU[item.id]
    }));
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

  // Breadcrumb do cabeçalho. A trilha vem de data.breadcrumb da rota ativa;
  // quando a rota não declara nada, cai no rótulo do item de menu da seção.
  readonly trilha = computed<ItemTrilha[]>(() => {
    this.url(); // recalcula a cada navegação
    const trilha = this.trilhaDaRota();
    if (trilha?.length) {
      return trilha;
    }
    const rotulo = this.rotuloDaSecao();
    return rotulo ? [{ rotulo, destaque: true }] : [];
  });

  private trilhaDaRota(): ItemTrilha[] | undefined {
    let rota = this.router.routerState.snapshot.root;
    while (rota.firstChild) {
      rota = rota.firstChild;
    }
    return rota.data?.['breadcrumb'] as ItemTrilha[] | undefined;
  }

  private rotuloDaSecao(): string {
    const partes = this.url().split('/');
    const secao = partes[2]?.split(/[?#]/)[0] ?? 'home';
    const itemMenu = this.menu().find(item => item.id === secao);
    return itemMenu ? itemMenu.label : '';
  }

  private formatarData(data: Date): string {
    const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  
  constructor() {
    this.session.load().subscribe();
  }
}