import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface Capitulo {
  id: string;
  numero: number;
  titulo: string;
  resumo: string;
  icone: LucideIcon;
  /** Conteúdo "Para entender" — linguagem simples, com analogias. */
  leigo: ReactNode;
  /** Conteúdo "Para o desenvolvedor" — arquivos, tabelas, fluxos. */
  dev: ReactNode;
  /** Pontos de atenção / regras a NÃO quebrar. */
  atencao?: ReactNode;
  /** Texto plano para a busca encontrar (concatenação de tudo que é texto). */
  buscaTexto: string;
}
