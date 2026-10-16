import { Component } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';

@Component({
  selector: 'app-security',
  imports: [RevealDirective],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss'
})
export class SecurityComponent {
  readonly compromissos = [
    {
      titulo: 'Acesso com responsabilidade',
      descricao: 'A abertura exige identificação e comprovação de vínculo com o imóvel.'
    },
    {
      titulo: 'Intervenção consciente',
      descricao: 'Priorizamos preservar a porta. Limites e riscos são explicados na avaliação.'
    },
    {
      titulo: 'Decisão informada',
      descricao: 'Opções de reparo ou substituição são apresentadas antes da execução.'
    }
  ];
}
