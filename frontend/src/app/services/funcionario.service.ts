import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/** Gêneros aceitos pela API (enum Gender do backend). */
export type Genero = 'MASCULINE' | 'FEMININE' | 'OTHERS';

/** Dados enviados no cadastro de um funcionário. O backend sempre cria a conta como EMPLOYEE. */
export interface NovoFuncionario {
  name: string;
  email: string;
  password: string;
  cpf: string;
  /** Data no formato ISO (AAAA-MM-DD). */
  birthDate: string;
  gender: Genero;
}

/** Funcionário como a API devolve (a senha nunca vem na resposta). */
export interface Funcionario {
  id: number;
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  gender: Genero;
  phone: string | null;
  role: 'ADMINISTRATOR' | 'EMPLOYEE';
}

/**
 * Cadastro e gestão de funcionários (rotas /accounts do backend).
 * Cadastrar, listar e excluir exigem um token de administrador.
 */
@Injectable({
  providedIn: 'root'
})
export class FuncionarioService {
  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/accounts`;

  cadastrar(funcionario: NovoFuncionario): Observable<Funcionario> {
    return this.http.post<Funcionario>(this.url, funcionario);
  }

  listar(): Observable<Funcionario[]> {
    return this.http.get<Funcionario[]>(this.url);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  atualizar(id: number, funcionario: Partial<NovoFuncionario>): Observable<Funcionario> {
    return this.http.patch<Funcionario>(`${this.url}/${id}`, funcionario);
  }
}
