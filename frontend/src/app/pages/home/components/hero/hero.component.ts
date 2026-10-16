import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../../directives/reveal.directive';
import { WhatsappService } from '../../../../services/whatsapp.service';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, RevealDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  readonly linkWhatsapp = inject(WhatsappService).gerarLink();

  readonly principios = [
    { icone: 'shield-check', texto: 'Cuidado com o seu patrimônio' },
    { icone: 'scan-line', texto: 'Diagnóstico antes da solução' },
    { icone: 'messages-square', texto: 'Clareza em cada etapa' }
  ];
}
