import { Injectable } from '@angular/core';

/**
 * Monta os links "clique para conversar" do WhatsApp (wa.me).
 * Para trocar o número do sistema inteiro, altere apenas NUMERO_WHATSAPP.
 */
const NUMERO_WHATSAPP = '5511987654321'; // número fictício: DDI + DDD + número

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  readonly mensagens = {
    geral: 'Olá, Miguel! Vim pelo site e gostaria de um atendimento.',
    emergencia:
      'Olá, Miguel! Estou com um problema para abrir a porta e preciso de orientação.\n\nTipo de porta: \nO que aconteceu: \nRegião do imóvel: ',
    orcamento:
      'Olá, Miguel! Gostaria de um orçamento.\n\nTipo de chave, fechadura ou porta: \nO que aconteceu e quando começou: \nRegião do imóvel: '
  };

  gerarLink(mensagem: string = this.mensagens.geral): string {
    return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
  }

  gerarLinkServico(servico: string): string {
    return this.gerarLink(`Olá, Miguel! Vim pelo site e tenho interesse no serviço de ${servico.toLowerCase()}.`);
  }
}
