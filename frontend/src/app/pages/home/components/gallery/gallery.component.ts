import { Component } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';

@Component({
  selector: 'app-gallery',
  imports: [RevealDirective],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent {
  readonly trabalhos = [
    {
      imagem: 'trabalho-ajuste.jpg',
      alt: 'Chaveiro ajustando o mecanismo de uma fechadura na bancada',
      etapa: 'Ajustar. Conferir. Testar.',
      detalhe: 'O mecanismo é avaliado antes de indicar a intervenção.'
    },
    {
      imagem: 'trabalho-perfil.jpg',
      alt: 'Três chaves douradas lado a lado sobre a bancada',
      etapa: 'O perfil faz a diferença.',
      detalhe: 'A escolha do blank começa pela chave original.'
    },
    {
      imagem: 'trabalho-encaixe.jpg',
      alt: 'Porta de madeira com maçaneta e fechadura instaladas',
      etapa: 'Cuidado até o encaixe.',
      detalhe: 'Instalação alinhada ao uso da porta.'
    }
  ];
}
