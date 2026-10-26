import { Directive, ElementRef, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '.reveal', // Aplica-se automaticamente a tudo o que tiver class="reveal"
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  private observer!: IntersectionObserver;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    // Configura o observador para detetar quando o elemento entra no ecrã
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Adiciona a classe que torna o elemento visível
          this.renderer.addClass(this.el.nativeElement, 'reveal--visivel');
          // Para de observar depois de animar a primeira vez
          this.observer.unobserve(this.el.nativeElement);
        }
      });
    }, { threshold: 0.1 }); // Dispara quando 10% do elemento estiver visível

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}