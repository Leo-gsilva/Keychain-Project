import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../environments/environment';

export interface MetricasServicos {
  total: number; // ordens do período, sem as canceladas
  completed: number;
  inProgress: number;
  pending: number;
  canceled: number;
  revenue: number; // valor cobrado dos concluídos
  received: number; // valor pago de todos os não cancelados
  partsCost: number;
}

export interface MetricasResumo {
  start: string;
  end: string;
  services: MetricasServicos;
  sales: {
    total: number;
    completed: number;
    canceled: number;
    revenue: number;
    itemsSold: number;
    partsCost: number;
  };
  totals: { revenue: number; partsCost: number; estimatedProfit: number };
}

/** Indicadores (rotas /metrics do backend). Só ADMINISTRATOR tem acesso. */
@Injectable({providedIn: 'root'})
export class MetricasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/metrics`;

  // Datas no formato AAAA-MM-DD; sem datas o backend usa o mês atual
  resumo(inicio?: string, fim?: string): Observable<MetricasResumo> {
    let params = new HttpParams();
    if (inicio) params = params.set('start', inicio);
    if (fim) params = params.set('end', fim);
    return this.http.get<MetricasResumo>(this.url, {params});
  }
}
