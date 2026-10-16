import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly links = [
    { texto: 'A oficina', ancora: 'oficina' },
    { texto: 'Serviços', ancora: 'servicos' },
    { texto: 'Cuidados', ancora: 'cuidados' },
    { texto: 'Contato', ancora: 'contato' }
  ];
}
