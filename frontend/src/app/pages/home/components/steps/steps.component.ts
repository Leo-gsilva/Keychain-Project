import { Component } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';

@Component({
  selector: 'app-steps',
  imports: [RevealDirective],
  templateUrl: './steps.component.html',
  styleUrl: './steps.component.scss'
})
export class StepsComponent {
  readonly etapas = [
    { numero: '01', titulo: 'Você conta', descricao: 'Descreva a necessidade e envie uma foto do mecanismo, se possível.' },
    { numero: '02', titulo: 'A gente avalia', descricao: 'Confirmamos o tipo de serviço, as condições e a disponibilidade.' },
    { numero: '03', titulo: 'Você aprova', descricao: 'O orçamento e a intervenção são alinhados antes de começar.' },
    { numero: '04', titulo: 'Tudo é conferido', descricao: 'O funcionamento é testado e você recebe orientações de uso.' }
  ];
}
