import { Component, inject, signal, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { FuncionarioService, Genero, Funcionario } from '../../../services/funcionario.service';
import { environment } from '../../../../environments/environment';

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).{8,}$/;

function validateCpf(control: AbstractControl): ValidationErrors | null {
  const digits = String(control.value ?? '').replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return { cpf: true };
  }

  const calculateDigit = (base: string): number => {
    const sum = base
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (base.length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 9));
  const secondDigit = calculateDigit(digits.slice(0, 10));

  return firstDigit === Number(digits[9]) && secondDigit === Number(digits[10]) ? null : { cpf: true };
}

function validateBirthDate(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 1900) return { invalidDate: true };
  if (date.getTime() > Date.now()) return { futureDate: true };
  return null;
}

function getTodayDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

type FormField = 'name' | 'email' | 'password' | 'cpf' | 'birthDate' | 'gender';

interface Message {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-editar-funcionario',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './editar-funcionario.component.html',
  styleUrl: './editar-funcionario.component.scss'
})
export class EditarFuncionarioComponent implements OnInit {
  private readonly employeeService = inject(FuncionarioService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly todayDateFormatted = (() => {
    const text = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
  })();

  readonly maxBirthDate = getTodayDate();

  readonly employeeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: [''], // opcional na edição
    cpf: ['', [Validators.required, validateCpf]],
    birthDate: ['', [Validators.required, validateBirthDate]],
    gender: ['', [Validators.required]]
  });

  readonly isSubmitting = signal(false);
  readonly message = signal<Message | null>(null);
  private readonly funcionarioId = signal<number | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/administrador/funcionarios']);
      return;
    }
    this.funcionarioId.set(id);

    this.employeeService.listar().subscribe({
      next: (lista: Funcionario[]) => {
        const funcionario = lista.find((f: Funcionario) => f.id === id);
        if (!funcionario) {
          this.router.navigate(['/administrador/funcionarios']);
          return;
        }
        this.employeeForm.patchValue({
          name: funcionario.name,
          email: funcionario.email,
          password: '',
          cpf: funcionario.cpf,
          birthDate: funcionario.birthDate,
          gender: funcionario.gender
        });
      },
      error: () => {
        this.message.set({ type: 'error', text: 'Não foi possível carregar os dados do funcionário.' });
      }
    });
  }

  formatCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);

    const formatted = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    input.value = formatted;
    this.employeeForm.controls.cpf.setValue(formatted);
  }

  showError(field: FormField): boolean {
    const control = this.employeeForm.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(field: FormField): string {
    const control = this.employeeForm.controls[field];

    if (control.hasError('required')) return 'Campo obrigatório.';

    if (field === 'email') {
      return control.hasError('maxlength')
        ? 'O e-mail pode ter no máximo 100 caracteres.'
        : 'Informe um e-mail válido.';
    }

    if (field === 'password') {
      return 'Use 8+ caracteres, com maiúscula, minúscula, número e símbolo (@#$%^&+=).';
    }

    if (field === 'cpf') return 'Informe um CPF válido.';

    if (field === 'birthDate') {
      return control.hasError('futureDate')
        ? 'A data não pode estar no futuro.'
        : 'Informe uma data válida.';
    }

    return 'Valor inválido.';
  }

  submit(): void {
    this.message.set(null);

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.message.set({ type: 'error', text: 'Confira os campos destacados antes de salvar.' });
      return;
    }

    const id = this.funcionarioId();
    if (!id) return;
    const funcionarioId: number = id;

    this.isSubmitting.set(true);
    const values = this.employeeForm.getRawValue();

    const payload: { name: string; email: string; cpf: string; birthDate: string; gender: Genero; password?: string } = {
      name: values.name.trim(),
      email: values.email.trim(),
      cpf: values.cpf.replace(/\D/g, ''),
      birthDate: values.birthDate,
      gender: values.gender as Genero
    };

    // Senha só é enviada se o usuário preencheu (opcional na edição)
    if (values.password) {
      payload.password = values.password;
    }

    this.employeeService.atualizar(funcionarioId, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.message.set({ type: 'success', text: 'Funcionário atualizado com sucesso.' });
      },
      error: (error: any) => {
        this.isSubmitting.set(false);
        this.message.set({ type: 'error', text: this.getErrorText(error) });
      }
    });
  }

  private getErrorText(error: any): string {
    if (error?.status === 0) {
      return `Não foi possível falar com o servidor. Confira se o backend está rodando em ${environment.apiUrl}.`;
    }
    if (error?.status === 400) {
      return 'O servidor recusou os dados. Confira as informações e tente novamente.';
    }
    if (error?.status === 401) {
      return 'Entre como administrador para editar funcionários.';
    }
    if (error?.status === 403) {
      return 'Sua conta não tem permissão para editar funcionários.';
    }
    if (error?.status === 409) {
      return 'Já existe uma conta cadastrada com esse CPF ou e-mail.';
    }
    return 'Não foi possível atualizar o funcionário. Tente novamente.';
  }
}
