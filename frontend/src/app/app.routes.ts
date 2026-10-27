import { Routes } from '@angular/router';

import { LandingComponent } from './pages/landing/landing.component';
import { AppShellComponent, Perfil } from './layouts/app-shell/app-shell.component';
import { FuncionarioEstoqueComponent } from './pages/funcionario/funcionario-estoque/funcionario-estoque.component';
import { FuncionarioCadastroItemComponent } from './pages/funcionario/funcionario-cadastro-item/funcionario-cadastro-item.component';

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
      data: { breadcrumb: ['Estoque'], secao: 'estoque' },
      component: FuncionarioEstoqueComponent
    },
    {
      path: 'cadastro-item',
      title: 'Cadastrar item | Miguel',
      data: { breadcrumb: ['Estoque', 'Cadastrar item'], secao: 'estoque' },
      component: FuncionarioCadastroItemComponent
    }
  ]),

  { path: '**', redirectTo: 'funcionario/estoque' }
];