import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../environments/environment';

export type TipoServico =
  | 'KEY_COPY'
  | 'KEY_MAKING'
  | 'UNLOCK_DOOR_VEHICLE_SAFE'
  | 'REPLACE_INSTALL_LOCK_CYLINDER'
  | 'LOCK_REPAIR'
  | 'AUTOMOTIVE_KEY_PROGRAMMING'
  | 'DIGITAL_LOCK_INSTALLATION_MAINTENANCE'
  | 'OTHER';

export type StatusServico = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

export type LocalServico = 'STORE' | 'ON_SITE';

export type FormaPagamentoServico = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TO_BE_DEFINED';

export interface ServicoRequest {
  clientName: string;
  clientPhone: string;
  clientCpfCnpj: string | null;
  serviceType: TipoServico;
  hiringDate: string;
  observations: string | null;
  location: LocalServico;
  address: string | null;
  serviceValue: number;
  paidValue: number;
  paymentMethod: FormaPagamentoServico;
  scheduledAt?: string | null;
}

export interface Servico {
  id: number;
  clientName: string;
  clientPhone: string;
  clientCpfCnpj: string | null;
  serviceType: TipoServico;
  hiringDate: string;
  status: StatusServico;
  observations: string | null;
  location: LocalServico;
  address: string | null;
  serviceValue: number;
  paidValue: number;
  paymentMethod: FormaPagamentoServico;
  scheduledAt: string | null;
}

export interface AnexoServico {
  id: number;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
}

/** Ordens de serviço e seus anexos (rotas /services do backend). */
@Injectable({
  providedIn: 'root'
})
export class ServicoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/services`;

  cadastrar(servico: ServicoRequest): Observable<Servico> {
    return this.http.post<Servico>(this.url, servico);
  }

  listar(): Observable<Servico[]> {
    return this.http.get<Servico[]>(this.url);
  }

  buscarPorId(id: number): Observable<Servico> {
    return this.http.get<Servico>(`${this.url}/${id}`);
  }

  atualizar(id: number, servico: ServicoRequest): Observable<Servico> {
    return this.http.put<Servico>(`${this.url}/${id}`, servico);
  }

  alterarStatus(id: number, status: StatusServico): Observable<Servico> {
    return this.http.patch<Servico>(`${this.url}/${id}/status`, {status});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  enviarAnexos(serviceId: number, arquivos: File[]): Observable<AnexoServico[]> {
    const formData = new FormData();
    for (const arquivo of arquivos) {
      formData.append('files', arquivo, arquivo.name);
    }
    return this.http.post<AnexoServico[]>(`${this.url}/${serviceId}/attachments`, formData);
  }

  listarAnexos(serviceId: number): Observable<AnexoServico[]> {
    return this.http.get<AnexoServico[]>(`${this.url}/${serviceId}/attachments`);
  }

  baixarAnexo(serviceId: number, attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.url}/${serviceId}/attachments/${attachmentId}`, {
      responseType: 'blob'
    });
  }

  excluirAnexo(serviceId: number, attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${serviceId}/attachments/${attachmentId}`);
  }
}

