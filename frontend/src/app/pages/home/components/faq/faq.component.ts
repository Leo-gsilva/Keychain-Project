import { Component, signal } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';

@Component({
  selector: 'app-faq',
  imports: [RevealDirective],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  readonly perguntas = [
    {
      pergunta: 'O que preciso enviar para pedir um orçamento?',
      resposta:
        'Descreva o problema, informe a região do imóvel e, se puder, envie fotos da chave, da fechadura ou da porta. A avaliação final pode depender de uma visita.'
    },
    {
      pergunta: 'É possível abrir a porta sem danificar a fechadura?',
      resposta:
        'Na maioria dos casos, sim. A abertura técnica busca preservar a porta e a fechadura, mas o resultado depende do tipo e do estado do mecanismo. Os riscos são explicados antes de qualquer intervenção.'
    },
    {
      pergunta: 'Preciso comprovar que posso acessar o imóvel?',
      resposta:
        'Sim. Para abrir portas, pedimos documento com foto e algo que comprove o vínculo com o imóvel, como conta de consumo, contrato de locação ou confirmação do responsável.'
    },
    {
      pergunta: 'Toda chave pode ser copiada?',
      resposta:
        'Nem todas. Chaves comuns e tetra costumam ser copiadas na hora. Modelos especiais, codificados ou de segurança podem exigir avaliação, peça específica ou autorização do fabricante.'
    },
    {
      pergunta: 'Como confirmar horários e região de atendimento?',
      resposta:
        'Pelo WhatsApp. Informe o serviço e o bairro do imóvel para confirmarmos a disponibilidade, o horário e se há deslocamento.'
    }
  ];

  /** Índice da pergunta aberta (-1 = todas fechadas). A primeira começa aberta, como no layout. */
  readonly aberta = signal(0);

  alternar(indice: number): void {
    this.aberta.update((atual) => (atual === indice ? -1 : indice));
  }
}
