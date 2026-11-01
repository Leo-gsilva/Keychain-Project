import { Role } from '../services/account.service';

export const ROLE_HOME: Record<Role, string> = {
  EMPLOYEE: '/funcionario',
  ADMINISTRATOR: '/administrador'
};

export const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: 'Funcionário',
  ADMINISTRATOR: 'Administrador'
};