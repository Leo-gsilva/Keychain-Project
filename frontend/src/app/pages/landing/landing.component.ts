import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive'; // Ajuste o caminho se necessário

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RevealDirective], 
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  
  servicos = [
    { 
      titulo: 'Cópia e confecção de chaves', 
      descricao: 'Cópia de chaves para o uso diário e confecção de chaves, com avaliação do perfil e do mecanismo.',
      rodape: 'Comum • Tetra • Outros perfis sob consulta'
    },
    { 
      titulo: 'Abertura de portas, veículos ou cofres', 
      descricao: 'Avaliação e abertura técnica de portas, veículos e cofres, conforme o tipo e a condição do mecanismo.',
      rodape: 'Mediante comprovação de acesso'
    },
    { 
      titulo: 'Troca ou instalação de fechaduras e cilindros', 
      descricao: 'Substituição de fechaduras e cilindros para renovar o controle de acesso.',
      rodape: 'Residências • Comércios'
    },
    { 
      titulo: 'Conserto de fechaduras', 
      descricao: 'Diagnóstico de travamentos, folgas e desgaste para recuperar o funcionamento.',
      rodape: 'Fechaduras • Cilindros • Trincos'
    },
    { 
      titulo: 'Cópia ou programação de chaves automotivas', 
      descricao: 'Atendimento para chaves de veículos, com avaliação do tipo de chave e do sistema do veículo.',
      rodape: 'Consulta prévia para confirmação de compatibilidade'
    },
    { 
      titulo: 'Outros serviços', 
      descricao: 'Abertura de cofres, instalação e manutenção de fechaduras digitais, com avaliação prévia do mecanismo.',
      rodape: 'Consulta prévia para definição do melhor caminho'
    }
  ];

  passos = [
    { num: '01', titulo: 'Você conta', desc: 'Descreva a necessidade e envie uma foto do mecanismo, se possível.' },
    { num: '02', titulo: 'A gente avalia', desc: 'Confirmamos o tipo de serviço, as condições e a disponibilidade.' },
    { num: '03', titulo: 'Você aprova', desc: 'O orçamento e a intervenção são alinhados antes de começar.' },
    { num: '04', titulo: 'Tudo é conferido', desc: 'O funcionamento é testado e você recebe orientações de uso.' }
  ];

  faqs = [
    { pergunta: 'O que preciso enviar para pedir um orçamento?', resposta: 'Descreva o problema, informe a região do imóvel e, se puder, envie fotos da chave, da fechadura ou da porta. A avaliação final pode depender de uma visita.', aberta: false },
    { pergunta: 'É possível abrir a porta sem danificar a fechadura?', resposta: 'Nossa prioridade é sempre preservar o mecanismo utilizando técnicas não destrutivas.', aberta: false },
    { pergunta: 'Preciso comprovar que posso acessar o imóvel?', resposta: 'Sim, por segurança exigimos identificação e comprovação de vínculo com o local.', aberta: false },
    { pergunta: 'Toda chave pode ser copiada?', resposta: 'A maioria sim, mas algumas chaves codificadas ou patenteadas exigem autorização específica.', aberta: false }
  ];

  toggleFaq(index: number) {
    this.faqs[index].aberta = !this.faqs[index].aberta;
  }
}