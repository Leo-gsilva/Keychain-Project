import {AbstractControl, ValidationErrors} from '@angular/forms';

import {FormaPagamentoServico, LocalServico} from '../services/servico.service';
import {textoParaNumero} from './dinheiro';

// ---------- Rótulos (complementam utils/servico-rotulos.ts) ----------
export const LOCAIS_ATENDIMENTO: { valor: LocalServico; nome: string }[] = [
  {valor: 'STORE', nome: 'Oficina / Balcão'},
  {valor: 'ON_SITE', nome: 'Atendimento externo'}
];

export const FORMAS_PAGAMENTO: { valor: FormaPagamentoServico; nome: string }[] = [
  {valor: 'TO_BE_DEFINED', nome: 'A definir'},
  {valor: 'PIX', nome: 'Pix'},
  {valor: 'CASH', nome: 'Dinheiro'},
  {valor: 'DEBIT_CARD', nome: 'Cartão de débito'},
  {valor: 'CREDIT_CARD', nome: 'Cartão de crédito'}
];

// ---------- Regras de anexos (iguais às do backend) ----------
export const EXTENSOES_FOTO = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic']);
export const EXTENSOES_DOCUMENTO = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']);
export const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB
export const LIMITE_ARQUIVOS = 20;

// ---------- Validadores ----------
export function dinheiroValido(controle: AbstractControl): ValidationErrors | null {
  const texto = String(controle.value ?? '').trim();
  if (texto === '') return null;
  const numero = textoParaNumero(texto);
  if (numero === null) return {dinheiro: true};
  return numero < 0 ? {negativo: true} : null;
}

/** Formato (00) 0000-0000 ou (00) 90000-0000, o mesmo exigido pelo backend. */
export function telefoneValido(controle: AbstractControl): ValidationErrors | null {
  const texto = String(controle.value ?? '').trim();
  if (texto === '') return null;
  return /^\([0-9]{2}\) 9?[0-9]{4}-[0-9]{4}$/.test(texto) ? null : {telefone: true};
}

/** Opcional, mas se preenchido deve ter 11 (CPF) ou 14 (CNPJ) dígitos. */
export function cpfOuCnpjValido(controle: AbstractControl): ValidationErrors | null {
  const numeros = String(controle.value ?? '').replace(/\D/g, '');
  if (numeros === '') return null;
  return numeros.length === 11 || numeros.length === 14 ? null : {documento: true};
}

// ---------- Máscaras ----------
export function mascararTelefone(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 11);
  let formatado = '';

  if (digitos.length > 0) formatado = '(' + digitos.slice(0, 2);
  if (digitos.length >= 3) {
    formatado += ') ';
    if (digitos.length <= 10) {
      formatado += digitos.slice(2, 6);
      if (digitos.length > 6) formatado += '-' + digitos.slice(6, 10);
    } else {
      formatado += digitos.slice(2, 7) + '-' + digitos.slice(7, 11);
    }
  }
  return formatado;
}

export function mascararDocumento(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 14);

  if (d.length <= 11) {
    if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
    return d;
  }

  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return d;
}

// ---------- Apresentação ----------
/** "2026-10-08" -> "08/10/2026" (sem passar por Date, para não deslocar o dia por fuso). */
export function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function numeroOrdem(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function extrairExtensao(nomeArquivo: string): string {
  const ponto = nomeArquivo.lastIndexOf('.');
  return ponto < 0 ? '' : nomeArquivo.slice(ponto + 1).toLowerCase();
}

export function ehImagem(contentType: string, nome: string): boolean {
  return contentType.startsWith('image/') || EXTENSOES_FOTO.has(extrairExtensao(nome));
}

export function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
