import { Component, inject } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';
import { WhatsappService } from '../../../../services/whatsapp.service';

@Component({
  selector: 'app-emergency',
  imports: [RevealDirective],
  templateUrl: './emergency.component.html',
  styleUrl: './emergency.component.scss'
})
export class EmergencyComponent {
  private readonly whatsapp = inject(WhatsappService);

  readonly linkWhatsapp = this.whatsapp.gerarLink(this.whatsapp.mensagens.emergencia);
}
