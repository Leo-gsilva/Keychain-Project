import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Miguel | Chaveiro & Oficina',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'login',
    title: 'Área do funcionário | Miguel',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  { path: '**', redirectTo: '' }
];
