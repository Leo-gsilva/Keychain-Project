import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/** Formas de pagamento aceitas numa venda (enum PaymentMethod do backend, sem TO_BE_DEFINED). */
export type FormaPagamento = 'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD';

export type StatusVenda = 'COMPLETED' | 'CANCELED';

/** Dados enviados ao finalizar uma venda. O preço de cada item e o vendedor são definidos pelo backend. */
export interface NovaVenda {
  clientName: string | null;
  clientPhone: string | null;
  clientCpf: string | null;
  paymentMethod: FormaPagamento;
  /** Só é usado no cartão de crédito. */
  installments: number;
  discount: number;
  observations: string | null;
  items: { itemId: number; quantity: number }[];
}

export interface ItemVenda {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** Venda como a API devolve. */
export interface Venda {
  id: number;
  clientName: string | null;
  clientPhone: string | null;
  clientCpf: string | null;
  paymentMethod: FormaPagamento;
  installments: number;
  subtotal: number;
  discount: number;
  total: number;
  observations: string | null;
  status: StatusVenda;
  createdAt: string;
  canceledAt: string | null;
  sellerName: string;
  items: ItemVenda[];
}

/** Vendas de balcão (rotas /sales do backend). Finalizar baixa o estoque; cancelar devolve. */
@Injectable({
  providedIn: 'root'
})
export class VendaService {
  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/sales`;

  registrar(venda: NovaVenda): Observable<Venda> {
    return this.http.post<Venda>(this.url, venda);
  }

  listar(): Observable<Venda[]> {
    return this.http.get<Venda[]>(this.url);
  }

  cancelar(id: number): Observable<Venda> {
    return this.http.patch<Venda>(`${this.url}/${id}/cancel`, {});
  }
}
