import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../environments/environment';

export interface MetricasServicos {
  total: number; // Serviços do período, sem as canceladas
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

export type MetricasVendas = MetricasResumo['sales'];

// Resumos zerados: o que os cards mostram (com pontinhos no lugar dos números) até o backend responder
export const SERVICOS_ZERADOS: MetricasServicos = {
  total: 0,
  completed: 0,
  inProgress: 0,
  pending: 0,
  canceled: 0,
  revenue: 0,
  received: 0,
  partsCost: 0
};

export const VENDAS_ZERADAS: MetricasVendas = {
  total: 0,
  completed: 0,
  canceled: 0,
  revenue: 0,
  itemsSold: 0,
  partsCost: 0
};

// NOVO (de "TipoAtividade" até o fim da interface Atividade)
export type TipoAtividade = 'SERVICE_CREATED' | 'SERVICE_STATUS_CHANGED' | 'SALE_CREATED' | 'SALE_CANCELED';

/** Um acontecimento de "Últimas movimentações" (GET /metrics/activity). O texto é montado na tela. */
export interface Atividade {
  type: TipoAtividade;
  at: string; // data e hora local, ex.: 2026-10-08T14:20:00
  referenceId: number; // id do serviço ou da venda
  status: string; // status atual do serviço ou da venda
  clientName: string | null; // nulo em venda de balcão
  detail: string; // tipo do serviço ou "N un." da venda
  amount: number; // valor pago do serviço ou total da venda
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
  // NOVO: últimos acontecimentos (serviços e vendas), do mais recente para o mais antigo. Limite de 1 a 50
  atividade(limite = 10): Observable<Atividade[]> {
    return this.http.get<Atividade[]>(`${this.url}/activity`, {params: new HttpParams().set('limit', limite)});
  }
}
