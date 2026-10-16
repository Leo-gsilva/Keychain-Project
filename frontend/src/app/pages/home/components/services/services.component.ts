import { Component, inject } from '@angular/core';
import { RevealDirective } from '../../../../directives/reveal.directive';
import { WhatsappService } from '../../../../services/whatsapp.service';

@Component({
  selector: 'app-services',
  imports: [RevealDirective],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent {
  private readonly whatsapp = inject(WhatsappService);

  readonly servicos = [
    {
      icone: 'key-round',
      nome: 'Cópias de chaves',
      descricao: 'Cópias para o uso diário, com conferência do perfil e do encaixe da chave.',
      escopo: 'Comum • Tetra • Outros perfis sob consulta'
    },
    {
      icone: 'door-open',
      nome: 'Abertura de portas',
      descricao: 'Avaliação e abertura técnica de portas, conforme o tipo e a condição da fechadura.',
      escopo: 'Mediante comprovação de acesso'
    },
    {
      icone: 'lock-keyhole',
      nome: 'Troca de fechaduras',
      descricao: 'Substituição de fechaduras e cilindros para renovar o controle de acesso.',
      escopo: 'Residências • Comércios'
    },
    {
      icone: 'settings-2',
      nome: 'Ajustes e manutenção',
      descricao: 'Diagnóstico de travamentos, folgas e desgaste para recuperar o funcionamento.',
      escopo: 'Fechaduras • Cilindros • Trincos'
    },
    {
      icone: 'scan-face',
      nome: 'Fechaduras digitais',
      descricao: 'Orientação sobre modelos e instalação, após avaliar a compatibilidade da porta.',
      escopo: 'Instalação sob avaliação'
    },
    {
      icone: 'briefcase-business',
      nome: 'Chaves e acessos especiais',
      descricao: 'Análise de chaves de móveis, cadeados e outros mecanismos que precisam de atenção.',
      escopo: 'Envie uma foto para consultar'
    }
  ].map((servico) => ({ ...servico, link: this.whatsapp.gerarLinkServico(servico.nome) }));
}
