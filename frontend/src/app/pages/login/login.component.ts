import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { Account } from '../../services/account.service';
import { SessionService } from '../../services/session.service';
import { ROLE_HOME } from '../../auth/roles';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private session = inject(SessionService);
  private router = inject(Router);

  showPassword = false;
  submitting = false;
  errorMessage = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]], 
    password: ['', Validators.required],
    remember: [false] // Removido o Validators.required para que a caixa não seja obrigatória
  });

  // Função para alternar a visualização da senha
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // Verifica se o campo está inválido e se já foi tocado
  hasError(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && control.touched;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.form.getRawValue();
    
    this.submitting = true;
    this.errorMessage = '';
    this.session.user.set(null); // Garante que sessões anteriores são limpas

    this.auth.login({ email, password }, remember).pipe(
      // Após sucesso no login, busca o perfil da conta para o SessionService
      switchMap(() => this.session.load())
    ).subscribe({
      next: (account: Account) => {
        // Usa o dicionário do auth/roles.ts para navegar para a tela certa
        this.router.navigate([ROLE_HOME[account.role]]);
      },
      error: (error: HttpErrorResponse) => {
        // Limpa o estado caso ocorra falha e exibe a mensagem
        this.auth.logout();
        this.submitting = false;
        this.errorMessage = this.describeError(error);
      }
    });
  }

  private describeError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Sem ligação ao servidor. Verifique a sua internet ou tente novamente.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'E-mail ou senha incorretos.';
    }
    return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
}