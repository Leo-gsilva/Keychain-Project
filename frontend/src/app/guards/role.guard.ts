import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ROLE_HOME } from '../auth/roles';
import { Role } from '../services/account.service';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

// Uso na rota: { canActivate: [roleGuard], data: { role: 'USER' } }
// Sem token -> login. Role diferente -> manda para a área do role da pessoa.
export const roleGuard: CanActivateFn = route => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const session = inject(SessionService);
  const expected = route.data['role'] as Role;

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  return session.load().pipe(
    map(account => (account.role === expected ? true : router.createUrlTree([ROLE_HOME[account.role]]))),
    // Token vencido ou inválido: limpa e volta para o login
    catchError(() => {
      auth.logout();
      return of(router.createUrlTree(['/login']));
    })
  );
};
