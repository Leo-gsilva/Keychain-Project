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
}

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/items`;

  cadastrar(item: ItemRequest): Observable<Item> {
    return this.http.post<Item>(this.url, item);
  }
}