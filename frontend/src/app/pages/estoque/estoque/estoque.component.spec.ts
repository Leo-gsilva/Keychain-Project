import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Item } from '../../../services/item.service';
import { EstoqueComponent } from './estoque.component';

function item(id: number, stock: number, minStock: number): Item {
  return { id, idCode: `ITM-${id}`, name: `Item ${id}`, brand: 'Marca', description: '', costPrice: 1, sellPrice: 2, stock, minStock };
}

describe('EstoqueComponent: cards do resumo', () => {
  let fixture: ComponentFixture<EstoqueComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstoqueComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstoqueComponent);
    fixture.detectChanges();
  });

  const tela = () => fixture.nativeElement as HTMLElement;
  const valores = () => Array.from(tela().querySelectorAll('.indicador__valor'));
  const itens = () => http.expectOne((r) => r.url.endsWith('/items'));

  it('mostra os 3 cards com pontinhos no lugar dos números enquanto os itens não chegam', () => {
    expect(valores().length).toBe(3);
    valores().forEach((valor) => expect(valor.querySelector('app-pontos-carregando')).not.toBeNull());
    expect(tela().textContent).toContain('Nenhum item abaixo do mínimo');
  });

  it('troca os pontinhos pelos números quando os itens chegam', () => {
    itens().flush([item(1, 0, 5), item(2, 10, 5), item(3, 3, 3), item(4, 20, 5)]);
    fixture.detectChanges();

    expect(tela().querySelector('app-pontos-carregando')).toBeNull();
    expect(valores().map((v) => v.textContent?.trim())).toEqual(['4', '2', '2']);
  });

  it('para de mostrar os pontinhos também quando a lista falha', () => {
    itens().flush(null, { status: 500, statusText: 'Erro' });
    fixture.detectChanges();

    expect(tela().querySelector('app-pontos-carregando')).toBeNull();
    expect(valores().map((v) => v.textContent?.trim())).toEqual(['0', '0', '0']);
  });
});
