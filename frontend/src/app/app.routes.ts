import {Routes} from '@angular/router';

import {VisualizarServicoComponent} from './pages/servicos/visualizar-servicos/visualizar-servico.component';
import {EditarServicoComponent} from './pages/servicos/editar-servicos/editar-servico.component';
import {LandingComponent} from './pages/landing/landing.component';
import {AppShellComponent} from './layouts/app-shell/app-shell.component';
import {Role} from './services/account.service';
import {roleGuard} from './guards/role.guard';
import {FuncionarioEstoqueComponent} from './pages/funcionario/funcionario-estoque/funcionario-estoque.component';
import {
  FuncionarioCadastroItemComponent
} from './pages/funcionario/funcionario-cadastro-item/funcionario-cadastro-item.component';
import {FuncionariosComponent} from './pages/administrador/funcionarios/funcionarios.component';
import {CadastrarFuncionarioComponent} from './pages/cadastrar-funcionario/cadastrar-funcionario.component';
import {ServicosComponent} from './pages/servicos/servicos.component';
import {CadastrarServicoComponent} from './pages/funcionario/funcionario-cadastrar-servico/cadastrar-servico.component';
import {VendasComponent} from './pages/vendas/vendas/vendas.component';
import {NovaVendaComponent} from './pages/vendas/nova-venda/nova-venda.component';
import {LoginComponent} from './pages/login/login.component';

function area(path: string, role: Role, children: Routes): Routes[0] {
  return {
    path,
    component: AppShellComponent,
    data: {role},
    canActivate: [roleGuard],
    children
  };
}

export const routes: Routes = [
  {path: '', title: 'Miguel | Chaveiro & Oficina', component: LandingComponent},
  {path: 'login', title: 'Login', component: LoginComponent},

  // ÁREA DO FUNCIONÁRIO
  area('funcionario', 'EMPLOYEE', [
    // TODO: trocar para a home quando existir
    {path: '', pathMatch: 'full', redirectTo: 'estoque'},

    {path: 'estoque', title: 'Estoque | Miguel', component: FuncionarioEstoqueComponent},
    {path: 'estoque/novo', title: 'Cadastrar item | Miguel', component: FuncionarioCadastroItemComponent},

    {path: 'servicos', title: 'Serviços | Miguel', component: ServicosComponent},
    {path: 'servicos/novo', title: 'Cadastrar serviço | Miguel', component: CadastrarServicoComponent},

    {path: 'servicos/:id', title: 'Visualizar serviço | Miguel', component: VisualizarServicoComponent},
    {path: 'servicos/:id/editar', title: 'Editar serviço | Miguel', component: EditarServicoComponent},

    {path: 'vendas', title: 'Vendas | Miguel', component: VendasComponent},
    {path: 'vendas/nova', title: 'Nova venda | Miguel', component: NovaVendaComponent},
  ]),

  // ÁREA DO ADMINISTRADOR
  area('administrador', 'ADMINISTRATOR', [
    // TODO: trocar para a home quando existir
    {path: '', pathMatch: 'full', redirectTo: 'estoque'},

    {path: 'estoque', title: 'Estoque | Miguel', component: FuncionarioEstoqueComponent},
    {path: 'estoque/novo', title: 'Cadastrar item | Miguel', component: FuncionarioCadastroItemComponent},

    {path: 'servicos', title: 'Serviços | Miguel', component: ServicosComponent},
    {path: 'servicos/novo', title: 'Cadastrar serviço | Miguel', component: CadastrarServicoComponent},

    {path: 'servicos/:id', title: 'Visualizar serviço | Miguel', component: VisualizarServicoComponent},
    {path: 'servicos/:id/editar', title: 'Editar serviço | Miguel', component: EditarServicoComponent},

    {path: 'vendas', title: 'Vendas | Miguel', component: VendasComponent},
    {path: 'vendas/nova', title: 'Nova venda | Miguel', component: NovaVendaComponent},

    {
      path: 'funcionarios',
      title: 'Funcionários | Miguel',
      component: FuncionariosComponent,
      data: { breadcrumb: [{ rotulo: 'Funcionários', destaque: true }] }
    },
    {path: 'funcionarios/novo', title: 'Cadastrar funcionário | Miguel', component: CadastrarFuncionarioComponent}
  ]),

  {path: '**', redirectTo: 'funcionario/estoque'}
];
