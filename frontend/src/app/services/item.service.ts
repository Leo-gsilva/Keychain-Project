import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface ItemRequest {
  idCode: string;
  name: string;
  brand: string;
  description: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  // TODO: quando o backend tiver estes campos, descomentar:
  // category: string;
  // unit: string;
}

export interface Item extends ItemRequest {
  id: number;
  // O backend ainda não devolve a categoria; quando devolver, a tela de estoque já usa.
  category?: string;
}

/** Item com estoque baixo (LOW_STOCK: no mínimo ou abaixo) ou zerado (OUT_OF_STOCK). */
export interface AlertaEstoque {
  id: number;
  idCode: string;
  name: string;
  stock: number;
  minStock: number;
  level: 'LOW_STOCK' | 'OUT_OF_STOCK';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/items`;

  cadastrar(item: ItemRequest): Observable<Item> {
    return this.http.post<Item>(this.url, item);
  }

  listar(): Observable<Item[]> {
    return this.http.get<Item[]>(this.url);
  }

  /** Só os itens com problema, do menor estoque para o maior. */
  alertas(): Observable<AlertaEstoque[]> {
    return this.http.get<AlertaEstoque[]>(`${this.url}/alerts`);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}