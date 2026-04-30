import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Parágrafo com espaçamento confortável. */
export const P = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("text-sm md:text-[0.95rem] leading-relaxed text-foreground/90", className)}>{children}</p>
);

/** Subtítulo dentro de um capítulo. */
export const H = ({ children }: { children: ReactNode }) => (
  <h3 className="text-base md:text-lg font-semibold mt-5 mb-2 text-foreground">{children}</h3>
);

/** Lista com marcadores. */
export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-[0.95rem] text-foreground/90 marker:text-primary">{children}</ul>
);

/** Lista numerada. */
export const OL = ({ children }: { children: ReactNode }) => (
  <ol className="list-decimal pl-5 space-y-1.5 text-sm md:text-[0.95rem] text-foreground/90 marker:text-primary marker:font-semibold">{children}</ol>
);

export const LI = ({ children }: { children: ReactNode }) => (
  <li className="leading-relaxed">{children}</li>
);

/** Código inline (nome de arquivo, função, tabela…). */
export const C = ({ children }: { children: ReactNode }) => (
  <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[0.85em] font-mono break-words">{children}</code>
);

/** Bloco de código / pseudo-código / fluxo. */
export const Pre = ({ children }: { children: ReactNode }) => (
  <pre className="my-3 p-3 rounded-md bg-muted/60 border border-border text-[12px] md:text-[12.5px] leading-relaxed font-mono whitespace-pre-wrap break-words overflow-x-auto">
    {children}
  </pre>
);

/** Citação destacada — usada para analogias. */
export const Quote = ({ children }: { children: ReactNode }) => (
  <blockquote className="my-3 pl-4 border-l-4 border-primary/40 text-sm md:text-[0.95rem] text-foreground/85 italic">
    {children}
  </blockquote>
);

/** Caixa de "ponto de atenção". */
export const Warn = ({ children }: { children: ReactNode }) => (
  <div className="my-3 rounded-md border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-foreground/90">
    {children}
  </div>
);

/** Caixa de "boa prática / dica". */
export const Tip = ({ children }: { children: ReactNode }) => (
  <div className="my-3 rounded-md border-l-4 border-accent bg-accent/5 p-3 text-sm text-foreground/90">
    {children}
  </div>
);

/** Tabela simples para listar campos / arquivos. */
export const Tab = ({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) => (
  <div className="my-3 overflow-x-auto rounded-md border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted/60">
        <tr>
          {headers.map((h) => (
            <th key={h} className="text-left px-3 py-2 font-semibold text-foreground/80 text-xs uppercase tracking-wide">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-muted/30">
            {r.map((cell, j) => (
              <td key={j} className="px-3 py-2 align-top text-foreground/90">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
