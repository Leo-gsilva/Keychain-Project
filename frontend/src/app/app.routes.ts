import { Routes } from '@angular/router';

import { LandingComponent } from './pages/landing/landing.component';
import { AppShellComponent, Perfil } from './layouts/app-shell/app-shell.component';
import { FuncionarioEstoqueComponent } from './pages/funcionario/funcionario-estoque/funcionario-estoque.component';
import { FuncionarioCadastroItemComponent } from './pages/funcionario/funcionario-cadastro-item/funcionario-cadastro-item.component';
import { CadastrarFuncionarioComponent } from './pages/cadastrar-funcionario/cadastrar-funcionario.component';
import { ServicosComponent } from './pages/servicos/servicos/servicos.component';
import { VendasComponent } from './pages/vendas/vendas/vendas.component';
import { NovaVendaComponent } from './pages/vendas/nova-venda/nova-venda.component';

// TODO: quando o login existir, adicionar canActivate aqui
function area(perfil: Perfil, children: Routes) {
  return {
    path: perfil,
    component: AppShellComponent,
    data: { perfil },
    children
  };
}

export const routes: Routes = [
  // TESTE: abre direto na área do funcionário. Depois voltar para o LandingComponent em path ''.
  { path: '', pathMatch: 'full', redirectTo: 'funcionario/estoque' },

  {
    path: 'landing',
    title: 'Miguel | Chaveiro & Oficina',
    component: LandingComponent
  },

  area('funcionario', [
    { path: '', pathMatch: 'full', redirectTo: 'estoque' },
    {
      path: 'estoque',
      title: 'Estoque | Miguel',
      data: { breadcrumb: [{ rotulo: 'Estoque' }], secao: 'estoque' },
      component: FuncionarioEstoqueComponent
    },
    {
      path: 'cadastro-item',
      title: 'Cadastrar item | Miguel',
      data: {
        breadcrumb: [
          { rotulo: 'Estoque', rota: '/funcionario/estoque' },
          { rotulo: 'Cadastrar item' }
        ],
        secao: 'estoque'
      },
      component: FuncionarioCadastroItemComponent
    },
    {
      path: 'servicos',
      title: 'Serviços | Miguel',
      data: { breadcrumb: [{ rotulo: 'Serviços' }], secao: 'servicos' },
      component: ServicosComponent
    },
    {
      path: 'vendas',
      title: 'Vendas | Miguel',
      data: { breadcrumb: [{ rotulo: 'Vendas' }], secao: 'vendas' },
      component: VendasComponent
    },
    {
      path: 'vendas/nova',
      title: 'Nova venda | Miguel',
      data: {
        breadcrumb: [
          { rotulo: 'Vendas', rota: '/funcionario/vendas' },
          { rotulo: 'Nova venda' }
        ],
        secao: 'vendas'
      },
      component: NovaVendaComponent
    },
    {
      path: 'cadastrar-funcionario',
      title: 'Cadastrar funcionário | Miguel',
      data: {
        breadcrumb: [{ rotulo: 'Funcionários' }, { rotulo: 'Cadastrar funcionário' }],
        secao: 'funcionarios'
      },
      component: CadastrarFuncionarioComponent
    }
  ]),

  { path: '**', redirectTo: 'funcionario/estoque' }
];