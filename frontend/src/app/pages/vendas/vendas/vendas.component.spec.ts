import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Account } from '../../../services/account.service';
import { MetricasResumo } from '../../../services/metricas.service';
import { SessionService } from '../../../services/session.service';
import { VendasComponent } from './vendas.component';

const RESUMO: MetricasResumo = {
  start: '2026-11-25',
  end: '2026-11-25',
  services: { total: 0, completed: 0, inProgress: 0, pending: 0, canceled: 0, revenue: 0, received: 0, partsCost: 0 },
  sales: { total: 9, completed: 8, canceled: 1, revenue: 564.5, itemsSold: 23, partsCost: 60 },
  totals: { revenue: 564.5, partsCost: 60, estimatedProfit: 504.5 }
};

describe('VendasComponent: cards do resumo do dia', () => {
  let fixture: ComponentFixture<VendasComponent>;
  let http: HttpTestingController;

  function abrir(role: Account['role']): void {
    TestBed.configureTestingModule({
      imports: [VendasComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    // O roleGuard já deixa a sessão carregada antes de abrir a tela
    TestBed.inject(SessionService).user.set({ role } as Account);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(VendasComponent);
    fixture.detectChanges();
  }

  const tela = () => fixture.nativeElement as HTMLElement;
  const cards = () => Array.from(tela().querySelectorAll('.indicador'));
  const valores = () => Array.from(tela().querySelectorAll('.indicador__valor'));
  const metricas = () => http.expectOne((r) => r.url.endsWith('/metrics'));

  it('mostra os cards zerados, com pontinhos no lugar dos números, enquanto o resumo não chega', () => {
    abrir('ADMINISTRATOR');

    expect(cards().length).toBe(3);
    valores().forEach((valor) => expect(valor.querySelector('app-pontos-carregando')).not.toBeNull());
    expect(tela().textContent).toContain('0 concluídas · 0 canceladas');
  });

  it('troca os pontinhos pelos números quando o resumo chega', () => {
    abrir('ADMINISTRATOR');
    metricas().flush(RESUMO);
    fixture.detectChanges();

    expect(tela().querySelector('app-pontos-carregando')).toBeNull();
    const [vendas, totalVendido, itensVendidos] = valores().map((v) => v.textContent?.trim());
    expect([vendas, itensVendidos]).toEqual(['9', '23']);
    expect(totalVendido).toMatch(/564,50/);
  });

  it('esconde os cards se o resumo falhar', () => {
    abrir('ADMINISTRATOR');
    metricas().flush(null, { status: 500, statusText: 'Erro' });
    fixture.detectChanges();

    expect(cards().length).toBe(0);
  });

  it('não mostra os cards nem pede o resumo para o funcionário', () => {
    abrir('EMPLOYEE');

    expect(cards().length).toBe(0);
    http.expectNone((r) => r.url.endsWith('/metrics'));
  });
});
