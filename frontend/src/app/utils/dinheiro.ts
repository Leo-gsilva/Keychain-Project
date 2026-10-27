export function textoParaNumero(texto: string | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;

  let limpo = String(texto).replace(/R\$|\s/g, '');
  if (limpo === '') return null;

  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }

  if (!/^-?\d+(\.\d+)?$/.test(limpo)) return null;
  return Number(limpo);
}

export function numeroParaTexto(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
}