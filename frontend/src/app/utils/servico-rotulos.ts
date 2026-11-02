import { StatusServico, TipoServico } from '../services/servico.service';

// Rótulos em português para os valores que o backend devolve.
// Usados na listagem de serviços (o cadastro ainda tem a própria cópia).
export const TIPOS_SERVICO: { valor: TipoServico; nome: string }[] = [
  { valor: 'KEY_COPY', nome: 'Cópia de chaves' },
  { valor: 'KEY_MAKING', nome: 'Confecção de chaves' },
  { valor: 'UNLOCK_DOOR_VEHICLE_SAFE', nome: 'Abertura de portas, veículos ou cofres' },
  { valor: 'REPLACE_INSTALL_LOCK_CYLINDER', nome: 'Troca de cilindro / instalação de fechaduras' },
  { valor: 'LOCK_REPAIR', nome: 'Conserto de fechaduras' },
  { valor: 'AUTOMOTIVE_KEY_PROGRAMMING', nome: 'Cópia ou programação de chaves automotivas' },
  { valor: 'DIGITAL_LOCK_INSTALLATION_MAINTENANCE', nome: 'Instalação e manutenção de fechaduras digitais' },
  { valor: 'OTHER', nome: 'Outro' }
];

export const STATUS_SERVICO: { valor: StatusServico; nome: string }[] = [
  { valor: 'PENDING', nome: 'Aguardando' },
  { valor: 'IN_PROGRESS', nome: 'Em execução' },
  { valor: 'COMPLETED', nome: 'Concluído' },
  { valor: 'CANCELED', nome: 'Cancelado' }
];
