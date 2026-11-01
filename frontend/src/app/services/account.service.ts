import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Gender = 'MASCULINE' | 'FEMININE' | 'OTHERS';
export type Role = 'EMPLOYEE' | 'ADMINISTRATOR';

export interface Address {
  cep: string;
  city: string;
  state: string;
  publicPlace: string;
  number: string;
  complement?: string;
}
export interface AccountRequest {
  name: string;
  cpf: string;
  birthDate: string; // formato AAAA-MM-DD
  gender: Gender;
  address: Address;
  phone?: string;
  email: string;
  password: string;
  role: Role;
}

export type Account = Omit<AccountRequest, 'password'> & { id: number };

@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts`;

  // POST /accounts: cadastro público, não exige token
  create(account: AccountRequest): Observable<Account> {
    return this.http.post<Account>(this.baseUrl, account);
  }

  //POST / accounts/employee: só ADMINISTRATOR, exige token”
  createEmployee(account:AccountRequest): Observable<Account>{
    return this.http.post<Account>(`${this.baseUrl}/employee`,account)
  }


  // GET /accounts/me: conta do token (nome, role...). O token vai pelo authInterceptor.
  me(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/me`);
  }
}