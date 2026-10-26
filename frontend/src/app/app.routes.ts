import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Miguel | Chaveiro & Oficina',
    component: LandingComponent
  },
  // TODO: rota /login (Área do funcionário) quando a página for criada
  { path: '**', redirectTo: '' }
];
