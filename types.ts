
export type Zona = 'Casa' | 'Quadrado' | 'House';
export type Acao = 'Ofensiva' | 'Ataque' | 'Defesa' | 'Recuo' | 'Contra-Ataque';
export type Atleta = 'A' | 'B';
export type ModalType = null | 'report' | 'confirmReset' | 'loading';

export interface LogEntry {
  id: number;
  acao: string;
  zona: Zona;
  placarA: number;
  placarB: number;
}

export interface MatchState {
  placarA: number;
  placarB: number;
  atletaA_nome: string;
  atletaB_nome: string;
  zonaAtiva: Zona;
  log: LogEntry[];
  updatedAt?: string;
}
