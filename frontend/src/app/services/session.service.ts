import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, tap } from 'rxjs';

import { Account, AccountService } from './account.service';
import { AuthService } from './auth.service';

// Guarda a conta logada (nome e role) para o menu e os guards
@Injectable({ providedIn: 'root' })
export class SessionService {
  private accountService = inject(AccountService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly user = signal<Account | null>(null);

  // Busca GET /accounts/me só uma vez; depois usa o que já está em memória
  load(): Observable<Account> {
    const cached = this.user();
    if (cached) {
      return of(cached);
    }
    return this.accountService.me().pipe(tap(account => this.user.set(account)));
  }

  logout(): void {
    this.auth.logout();
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
