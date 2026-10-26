import { ViewportScroller } from '@angular/common';
import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../directives/reveal.directive';

/**
 * Número usado em todos os botões do WhatsApp da página (wa.me).
 * Para trocar o número, altere apenas aqui: DDI + DDD + número.
 */
const NUMERO_WHATSAPP = '5511987654321'; // número fictício

/** Monta o link "clique para conversar" do WhatsApp já com a mensagem preenchida. */
function linkWhatsapp(mensagem: string): string {
  return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, RevealDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  host: {
    '(window:scroll)': 'verificarRolagem()'
  }
})
export class LandingComponent {
  /* ---------- WhatsApp ---------- */
  readonly whatsapp = {
    geral: linkWhatsapp('Olá, Miguel! Vim pelo site e gostaria de um atendimento.'),
    emergencia: linkWhatsapp(
      'Olá, Miguel! Estou com um problema para abrir a porta e preciso de orientação.\n\nTipo de porta: \nO que aconteceu: \nRegião do imóvel: '
    ),
    orcamento: linkWhatsapp(
      'Olá, Miguel! Gostaria de um orçamento.\n\nTipo de chave, fechadura ou porta: \nO que aconteceu e quando começou: \nRegião do imóvel: '
    )
  };

  /* ---------- Header ---------- */
  readonly linksMenu = [
    { texto: 'A oficina', ancora: 'oficina' },
    { texto: 'Serviços', ancora: 'servicos' },
    { texto: 'Como funciona', ancora: 'como-funciona' },
    { texto: 'Dúvidas', ancora: 'duvidas' }
  ];

  readonly menuAberto = signal(false);

  /** Fica true depois que a página rola um pouco (header mais baixo e com sombra). */
  readonly compacto = signal(false);

  private readonly header = viewChild.required<ElementRef<HTMLElement>>('header');

  /* ---------- Hero ---------- */
  readonly principios = [
    { icone: 'shield-check', texto: 'Cuidado com o seu patrimônio' },
    { icone: 'scan-line', texto: 'Diagnóstico antes da solução' },
    { icone: 'messages-square', texto: 'Clareza em cada etapa' }
  ];

  /* ---------- Serviços ---------- */
  readonly servicos = [
    {
      icone: 'key-round',
      nome: 'Cópia e confecção de chaves',
      descricao: 'Cópia de chaves para o uso diário e confecção de chaves, com avaliação do perfil e do mecanismo.',
      escopo: 'Comum • Tetra • Outros perfis sob consulta'
    },
    {
      icone: 'door-open',
      nome: 'Abertura de portas, veículos ou cofres',
      descricao: 'Avaliação e abertura técnica de portas, veículos e cofres, conforme o tipo e a condição do mecanismo.',
      escopo: 'Mediante comprovação de acesso'
    },
    {
      icone: 'lock-keyhole',
      nome: 'Troca ou instalação de fechaduras e cilindros',
      descricao: 'Substituição de fechaduras e cilindros para renovar o controle de acesso.',
      escopo: 'Residências • Comércios'
    },
    {
      icone: 'settings-2',
      nome: 'Conserto de fechaduras',
      descricao: 'Diagnóstico de travamentos, folgas e desgaste para recuperar o funcionamento.',
      escopo: 'Fechaduras • Cilindros • Trincos'
    },
    {
      icone: 'key',
      nome: 'Cópia ou programação de chaves automotivas',
      descricao: 'Atendimento para chaves de veículos, com avaliação do tipo de chave e do sistema do veículo.',
      escopo: 'Consulta prévia para confirmação de compatibilidade'
    },
    {
      icone: 'scan-face',
      nome: 'Outros serviços',
      descricao: 'Abertura de cofres, instalação e manutenção de fechaduras digitais, com avaliação prévia do mecanismo.',
      escopo: 'Consulta prévia para definição do melhor caminho'
    }
  ].map((servico) => ({
    ...servico,
    link: linkWhatsapp(`Olá, Miguel! Vim pelo site e tenho interesse no serviço: ${servico.nome}.`)
  }));

  /* ---------- Galeria ---------- */
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

  /* ---------- Como funciona ---------- */
  readonly etapas = [
    { numero: '01', titulo: 'Você conta', descricao: 'Descreva a necessidade e envie uma foto do mecanismo, se possível.' },
    { numero: '02', titulo: 'A gente avalia', descricao: 'Confirmamos o tipo de serviço, as condições e a disponibilidade.' },
    { numero: '03', titulo: 'Você aprova', descricao: 'O orçamento e a intervenção são alinhados antes de começar.' },
    { numero: '04', titulo: 'Tudo é conferido', descricao: 'O funcionamento é testado e você recebe orientações de uso.' }
  ];

  /* ---------- Segurança ---------- */
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

  /* ---------- Cuidados ---------- */
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

  /* ---------- Dúvidas ---------- */
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
  readonly perguntaAberta = signal(0);

  /* ---------- Localização ---------- */
  /** Para mudar o endereço da loja, altere só aqui (o mapa e o link "Como chegar" são gerados a partir dele). */
  readonly endereco = (() => {
    const rua = 'R. Verbo Divino, 1485';
    const bairro = 'Chácara Santo Antônio (Zona Sul), São Paulo - SP';
    const cep = '04719-002';
    const busca = encodeURIComponent(`${rua} - ${bairro}, ${cep}, Brasil`);

    return {
      rua,
      bairro,
      cep,
      // Embed do Google Maps sem chave de API. O Angular bloqueia URLs dinâmicas em <iframe>,
      // então a URL (fixa e montada aqui) é marcada como confiável.
      mapa: inject(DomSanitizer).bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${busca}&output=embed`),
      rota: `https://www.google.com/maps/dir/?api=1&destination=${busca}`
    };
  })();

  readonly modosAtendimento = [
    { icone: 'house', texto: 'Atendimento no local do cliente' },
    { icone: 'briefcase-business', texto: 'Atendimento no estabelecimento' },
    { icone: 'check', texto: 'Com e sem agendamento, conforme disponibilidade' }
  ];

  /* ---------- Contato ---------- */
  readonly checklist = [
    'Tipo de chave, fechadura ou porta',
    'O que aconteceu e quando começou',
    'Região do imóvel, se houver visita'
  ];

  /* ---------- Rodapé ---------- */
  readonly linksRodape = [
    { texto: 'A oficina', ancora: 'oficina' },
    { texto: 'Serviços', ancora: 'servicos' },
    { texto: 'Cuidados', ancora: 'cuidados' },
    { texto: 'Contato', ancora: 'contato' }
  ];

  constructor() {
    // Como o header é fixo, os links com âncora descontam a altura dele para o título não ficar escondido
    inject(ViewportScroller).setOffset(() => [0, this.header().nativeElement.offsetHeight]);

    // Caso a página já abra rolada (ex.: recarregar no meio da página)
    afterNextRender(() => this.verificarRolagem());
  }

  verificarRolagem(): void {
    this.compacto.set(window.scrollY > 8);
  }

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  fecharMenu(): void {
    this.menuAberto.set(false);
  }

  alternarPergunta(indice: number): void {
    this.perguntaAberta.update((atual) => (atual === indice ? -1 : indice));
  }
}
