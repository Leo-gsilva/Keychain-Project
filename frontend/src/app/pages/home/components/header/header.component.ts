import { ViewportScroller } from '@angular/common';
import { Component, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WhatsappService } from '../../../../services/whatsapp.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  host: {
    '[class.header--compacto]': 'compacto()',
    '(window:scroll)': 'verificarRolagem()'
  }
})
export class HeaderComponent {
  readonly linkWhatsapp = inject(WhatsappService).gerarLink();

  readonly links = [
    { texto: 'A oficina', ancora: 'oficina' },
    { texto: 'Serviços', ancora: 'servicos' },
    { texto: 'Como funciona', ancora: 'como-funciona' },
    { texto: 'Dúvidas', ancora: 'duvidas' }
  ];

  readonly menuAberto = signal(false);

  /** Fica true depois que a página rola um pouco (header mais baixo e com sombra). */
  readonly compacto = signal(false);

  constructor() {
    const elemento: HTMLElement = inject(ElementRef).nativeElement;

    // Como o header é fixo, os links com âncora descontam a altura dele para o título não ficar escondido
    inject(ViewportScroller).setOffset(() => [0, elemento.offsetHeight]);

    // Caso a página já abra rolada (ex.: recarregar no meio da página)
    afterNextRender(() => this.verificarRolagem());
  }

  verificarRolagem(): void {
    this.compacto.set(window.scrollY > 8);
  }

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  fecharMenu(): void {
    this.menuAberto.set(false);
  }
}
