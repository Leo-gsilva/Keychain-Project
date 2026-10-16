import { DestroyRef, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';

/**
 * Animação de entrada "fade-in-up": o elemento surge subindo quando entra na tela.
 * O visual fica em styles.scss (.reveal). Opcionalmente recebe um atraso em ms,
 * útil para escalonar itens de uma lista.
 *
 * Uso: <div appReveal></div>  |  <li [appReveal]="i * 100"></li>
 */
@Directive({
  selector: '[appReveal]',
  host: {
    class: 'reveal',
    '[style.--reveal-atraso]': 'atraso() + "ms"'
  }
})
export class RevealDirective {
  readonly atraso = input(0, { alias: 'appReveal', transform: (valor: unknown) => numberAttribute(valor, 0) });

  constructor() {
    const elemento: HTMLElement = inject(ElementRef).nativeElement;

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          elemento.classList.add('reveal--visivel');
          observer.disconnect(); // anima só uma vez
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(elemento);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
