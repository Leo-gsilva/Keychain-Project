import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Três pontinhos pulando no lugar do número de um card enquanto o backend ainda não respondeu.
 * Herdam a cor (currentColor) e o tamanho (em) do texto onde estão, então servem em qualquer card,
 * inclusive nos de fundo escuro, e não mudam a altura da linha.
 *
 * Uso: <p class="indicador__valor"><app-pontos-carregando /></p>
 */
@Component({
  selector: 'app-pontos-carregando',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-label': 'Carregando' },
  template: `<span></span><span></span><span></span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: flex-end;
      gap: 0.13em;
      height: 0.72em;
      vertical-align: baseline;
    }

    span {
      width: 0.17em;
      height: 0.17em;
      border-radius: 50%;
      background-color: currentColor;
      opacity: 0.45;
      animation: pular 1.1s ease-in-out infinite;
    }

    span:nth-child(2) {
      animation-delay: 0.15s;
    }

    span:nth-child(3) {
      animation-delay: 0.3s;
    }

    @keyframes pular {
      0%,
      60%,
      100% {
        transform: translateY(0);
        opacity: 0.45;
      }
      30% {
        transform: translateY(-0.34em);
        opacity: 1;
      }
    }

    /* Respeita quem prefere menos movimento: os pontos ficam parados */
    @media (prefers-reduced-motion: reduce) {
      span {
        animation: none;
        opacity: 0.7;
      }
    }
  `
})
export class PontosCarregandoComponent {}
