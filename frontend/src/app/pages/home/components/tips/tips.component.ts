import { Component } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';

@Component({
  selector: 'app-tips',
  imports: [RevealDirective],
  templateUrl: './tips.component.html',
  styleUrl: './tips.component.scss'
})
export class TipsComponent {
  readonly dicas = [
    {
      icone: 'key',
      titulo: 'A chave está pesada?',
      descricao:
        'Evite forçar ou usar a chave como alavanca. Resistência ao girar pode indicar desalinhamento ou desgaste.'
    },
    {
      icone: 'droplets',
      titulo: 'Antes de lubrificar',
      descricao:
        'Use apenas o produto indicado para o mecanismo. Óleo inadequado pode acumular resíduos e piorar o travamento.'
    },
    {
      icone: 'house',
      titulo: 'Mudou de imóvel?',
      descricao:
        'Considere trocar o cilindro ou revisar o controle das chaves. É uma forma de reorganizar quem tem acesso.'
    }
  ];
}
