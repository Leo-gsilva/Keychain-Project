import { AlertaEstoque } from '../services/item.service';
import { Servico } from '../services/servico.service';

// Funções puras usadas pelas duas homes (administrador e funcionário).

// Data local no formato AAAA-MM-DD (o que o backend espera e devolve)
export function dataIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// "2026-10-08" -> "08/10/2026" (sem passar por Date, para não deslocar o dia por fuso)
export function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// "2026-10-08" -> "08/10"
export function diaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

export function primeiroNome(nome: string | null | undefined): string {
  return nome?.trim().split(/\s+/)[0] ?? '';
}

// 18 -> "#018", igual à tela de Serviços
export function numeroServico(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

export function pluralizar(quantidade: number, singular: string, plural: string): string {
  return quantidade === 1 ? singular : plural;
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "2026-10-08T15:00:00" -> "15:00" se for hoje; senão "09/10 15:00"
export function horaOuData(iso: string, agora = new Date()): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';

  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (mesmoDia(data, agora)) return hora;

  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dia} ${hora}`;
}

// Coluna "Previsão" das tabelas
export function previsaoCurta(iso: string | null, agora = new Date()): string {
  return iso ? horaOuData(iso, agora) : 'A confirmar';
}

// Card "Atendimento externo": "hoje, às 15:00" | "amanhã, às 09:00" | "09/10, às 15:00"
export function previsaoExtenso(iso: string | null, agora = new Date()): string {
  if (!iso) return 'a confirmar';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'a confirmar';

  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const amanha = new Date(agora);
  amanha.setDate(agora.getDate() + 1);

  if (mesmoDia(data, agora)) return `hoje, às ${hora}`;
  if (mesmoDia(data, amanha)) return `amanhã, às ${hora}`;
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dia}, às ${hora}`;
}

// Serviços ainda por fazer (aguardando ou em execução), no serviço de trabalho:
// as com previsão primeiro (da mais cedo para a mais tarde); sem previsão vão depois, da mais nova para a mais antiga.
export function servicosEmAberto(lista: Servico[]): Servico[] {
  const momento = (s: Servico) => (s.scheduledAt ? new Date(s.scheduledAt).getTime() : Infinity);

  return lista
    .filter((s) => s.status === 'PENDING' || s.status === 'IN_PROGRESS')
    .sort((a, b) => {
      const ma = momento(a);
      const mb = momento(b);
      if (ma !== mb) return ma < mb ? -1 : 1;
      return b.id - a.id;
    });
}

// Zerados primeiro; depois os mais longe do mínimo de reposição
export function ordenarAlertas(lista: AlertaEstoque[]): AlertaEstoque[] {
  const gravidade = (a: AlertaEstoque) => (a.level === 'OUT_OF_STOCK' ? 0 : 1);
  const proporcao = (a: AlertaEstoque) => (a.minStock > 0 ? a.stock / a.minStock : 0);

  return [...lista].sort(
    (a, b) =>
      gravidade(a) - gravidade(b) || proporcao(a) - proporcao(b) || a.name.localeCompare(b.name, 'pt-BR')
  );
}

// Valor em reais sem ",00" quando o número é redondo ("R$ 960"); com centavos quando precisa ("R$ 12,50")
export function moedaCurta(valor: number): string {
  const redondo = Math.abs(valor - Math.round(valor)) < 0.005;
  return valor
    .toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: redondo ? 0 : 2,
      maximumFractionDigits: 2
    })
    .replace(/\u00a0/g, ' ');
}
