import {Routes} from '@angular/router';

import {roleGuard} from './guards/role.guard';
import {AppShellComponent} from './layouts/app-shell/app-shell.component';
import {Role} from './services/account.service';

// Páginas organizadas por funcionalidade: pages/<funcionalidade>/<tela>/
import {LandingComponent} from './pages/landing/landing.component';
import {LoginComponent} from './pages/login/login.component';
import {HomeAdministradorComponent} from './pages/home/home-administrador/home-administrador.component';
import {HomeFuncionarioComponent} from './pages/home/home-funcionario/home-funcionario.component';
import {EstoqueComponent} from './pages/estoque/estoque/estoque.component';
import {CadastrarItemComponent} from './pages/estoque/cadastrar-item/cadastrar-item.component';
import {ServicosComponent} from './pages/servicos/servicos/servicos.component';
import {CadastrarServicoComponent} from './pages/servicos/cadastrar-servico/cadastrar-servico.component';
import {EditarServicoComponent} from './pages/servicos/editar-servico/editar-servico.component';
import {VisualizarServicoComponent} from './pages/servicos/visualizar-servico/visualizar-servico.component';
import {VendasComponent} from './pages/vendas/vendas/vendas.component';
import {NovaVendaComponent} from './pages/vendas/nova-venda/nova-venda.component';
import {FuncionariosComponent} from './pages/funcionarios/funcionarios/funcionarios.component';
import {CadastrarFuncionarioComponent} from './pages/funcionarios/cadastrar-funcionario/cadastrar-funcionario.component';
import {EditarFuncionarioComponent} from './pages/funcionarios/editar-funcionario/editar-funcionario.component';
import {VisualizarFuncionarioComponent} from './pages/funcionarios/visualizar-funcionario/visualizar-funcionario.component';

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

    {path: '', pathMatch: 'full', redirectTo: 'home'},
    {path: 'home', title: 'Home | Miguel', component: HomeFuncionarioComponent},

    {path: 'estoque', title: 'Estoque | Miguel', component: EstoqueComponent},
    {path: 'estoque/novo', title: 'Cadastrar item | Miguel', component: CadastrarItemComponent},

    {path: 'servicos', title: 'Serviços | Miguel', component: ServicosComponent},
    {path: 'servicos/novo', title: 'Cadastrar serviço | Miguel', component: CadastrarServicoComponent},

    {path: 'servicos/:id', title: 'Visualizar serviço | Miguel', component: VisualizarServicoComponent},
    {path: 'servicos/:id/editar', title: 'Editar serviço | Miguel', component: EditarServicoComponent},

    {path: 'vendas', title: 'Vendas | Miguel', component: VendasComponent},
    {path: 'vendas/nova', title: 'Nova venda | Miguel', component: NovaVendaComponent},
    {path: 'vendas/:id', title: 'Visualizar venda | Miguel', component: NovaVendaComponent, data: {modo: 'visualizar'}},
    {path: 'vendas/:id/editar', title: 'Editar venda | Miguel', component: NovaVendaComponent, data: {modo: 'editar'}},
  ]),

  // ÁREA DO ADMINISTRADOR
  area('administrador', 'ADMINISTRATOR', [

    {path: '', pathMatch: 'full', redirectTo: 'home'},

    {                                                                                               // NOVO (bloco inteiro)
      path: 'home',
      title: 'Home | Miguel',
      component: HomeAdministradorComponent,
      data: { breadcrumb: [{ rotulo: 'Home · Administrador', destaque: true }] }
    },

    {path: 'estoque', title: 'Estoque | Miguel', component: EstoqueComponent},
    {path: 'estoque/novo', title: 'Cadastrar item | Miguel', component: CadastrarItemComponent},

    {path: 'servicos', title: 'Serviços | Miguel', component: ServicosComponent},
    {path: 'servicos/novo', title: 'Cadastrar serviço | Miguel', component: CadastrarServicoComponent},

    {path: 'servicos/:id', title: 'Visualizar serviço | Miguel', component: VisualizarServicoComponent},
    {path: 'servicos/:id/editar', title: 'Editar serviço | Miguel', component: EditarServicoComponent},

    {path: 'vendas', title: 'Vendas | Miguel', component: VendasComponent},
    {path: 'vendas/nova', title: 'Nova venda | Miguel', component: NovaVendaComponent},
    {path: 'vendas/:id', title: 'Visualizar venda | Miguel', component: NovaVendaComponent, data: {modo: 'visualizar'}},
    {path: 'vendas/:id/editar', title: 'Editar venda | Miguel', component: NovaVendaComponent, data: {modo: 'editar'}},

    {
      path: 'funcionarios',
      title: 'Funcionários | Miguel',
      component: FuncionariosComponent,
      data: { breadcrumb: [{ rotulo: 'Funcionários', destaque: true }] }
    },
    {path: 'funcionarios/novo', title: 'Cadastrar funcionário | Miguel', component: CadastrarFuncionarioComponent},
    {path: 'funcionarios/:id/editar', title: 'Editar funcionário | Miguel', component: EditarFuncionarioComponent},
    {path: 'funcionarios/:id', title: 'Visualizar funcionário | Miguel', component: VisualizarFuncionarioComponent}
  ]),

  {path: '**', redirectTo: 'funcionario/home'}
];
