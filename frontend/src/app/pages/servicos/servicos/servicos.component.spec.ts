import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Account } from '../../../services/account.service';
import { MetricasResumo } from '../../../services/metricas.service';
import { SessionService } from '../../../services/session.service';
import { ServicosComponent } from './servicos.component';

const RESUMO: MetricasResumo = {
  start: '2026-11-25',
  end: '2026-11-25',
  services: { total: 9, completed: 5, inProgress: 2, pending: 2, canceled: 0, revenue: 900, received: 1000, partsCost: 100 },
  sales: { total: 0, completed: 0, canceled: 0, revenue: 0, itemsSold: 0, partsCost: 0 },
  totals: { revenue: 900, partsCost: 100, estimatedProfit: 800 }
};

describe('ServicosComponent: cards do resumo do dia', () => {
  let fixture: ComponentFixture<ServicosComponent>;
  let http: HttpTestingController;

  function abrir(role: Account['role']): void {
    TestBed.configureTestingModule({
      imports: [ServicosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    // O roleGuard já deixa a sessão carregada antes de abrir a tela
    TestBed.inject(SessionService).user.set({ role } as Account);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ServicosComponent);
    fixture.detectChanges();
  }

  const tela = () => fixture.nativeElement as HTMLElement;
  const cards = () => Array.from(tela().querySelectorAll('.indicador'));
  const valores = () => Array.from(tela().querySelectorAll('.indicador__valor'));
  const metricas = () => http.expectOne((r) => r.url.endsWith('/metrics'));

  it('mostra os cards zerados, com pontinhos no lugar dos números, enquanto o resumo não chega', () => {
    abrir('ADMINISTRATOR');

    expect(cards().length).toBe(4);
    valores().forEach((valor) => expect(valor.querySelector('app-pontos-carregando')).not.toBeNull());
    expect(tela().textContent).toContain('0 em execução · 0 aguardando');
  });

  it('troca os pontinhos pelos números quando o resumo chega', () => {
    abrir('ADMINISTRATOR');
    metricas().flush(RESUMO);
    fixture.detectChanges();

    expect(tela().querySelector('app-pontos-carregando')).toBeNull();
    const [total, concluidos, emAberto, recebido] = valores().map((v) => v.textContent?.trim());
    expect([total, concluidos, emAberto]).toEqual(['9', '5', '4']);
    expect(recebido).toMatch(/1\.000,00/);
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
