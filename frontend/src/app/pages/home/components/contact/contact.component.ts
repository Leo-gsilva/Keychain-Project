import { Component, inject } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';
import { WhatsappService } from '../../../../services/whatsapp.service';

@Component({
  selector: 'app-contact',
  imports: [RevealDirective],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  private readonly whatsapp = inject(WhatsappService);

  readonly linkWhatsapp = this.whatsapp.gerarLink(this.whatsapp.mensagens.orcamento);

  readonly checklist = [
    'Tipo de chave, fechadura ou porta',
    'O que aconteceu e quando começou',
    'Região do imóvel, se houver visita'
  ];
}
