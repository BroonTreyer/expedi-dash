import { describe, expect, it } from "vitest";
import { gerarTextoComprovante } from "@/lib/comprovante-texto";
import type { Adiantamento } from "@/hooks/useAdiantamentos";

const mk = (p: Partial<Adiantamento>): Adiantamento =>
  ({
    id: Math.random().toString(36).slice(2),
    numero: "ADT-1",
    transportadora: "MOREIRA TRANSPORTES E LOG LTDA",
    transportadora_id: "t1",
    tipo_agrupamento: "ordem",
    ordem_carga: "132371",
    qtd_ctes: 1,
    peso_total: 0,
    valor_total_ctes: 0,
    percentual: 80,
    valor_adiantamento: 0,
    valor_saldo: 0,
    status: "pago",
    created_at: "2026-08-14",
    cteNumbers: [],
    ...p,
  }) as unknown as Adiantamento;

const transp = [
  { id: "t1", nome: "MOREIRA TRANSPORTES E LOG LTDA", codigo: "32982", pix_chave: "moreiratransportes21@gmail.com" },
] as any;

describe("gerarTextoComprovante", () => {
  const adts = [
    mk({ numero: "ADT-11", peso_total: 4000, valor_total_ctes: 3600, valor_adiantamento: 2880, valor_saldo: 720, cteNumbers: ["1424"] }),
    mk({ numero: "ADT-12", peso_total: 26000, valor_total_ctes: 23400, valor_adiantamento: 18720, valor_saldo: 4680, cteNumbers: ["1425"] }),
    mk({ numero: "ADT-13", peso_total: 0, valor_total_ctes: 4500, valor_adiantamento: 3600, valor_saldo: 900, cteNumbers: ["1423"] }),
    mk({ numero: "ADT-1", ordem_carga: "132357", peso_total: 29512.8, valor_total_ctes: 26000, valor_adiantamento: 20800, valor_saldo: 5200, cteNumbers: ["1398"] }),
    mk({ numero: "ADT-2", ordem_carga: "132357", peso_total: 0, valor_total_ctes: 5113.72, valor_adiantamento: 4090.98, valor_saldo: 1022.74, cteNumbers: ["1397"] }),
  ];

  it("quitação segue o modelo", () => {
    const t = gerarTextoComprovante({ adiantamentos: adts, modo: "quitacao", transportadoras: transp });
    const nb = (s: string) => s.replace(/\u00a0/g, " ");
    expect(nb(t)).toBe(
      [
        "QUITAÇÃO DO FRETE CIF, FORA DO ESTADO.",
        "",
        "1. OC 132357 (29.512,80 KG) CTE 1397/1398 VLR R$ 6.222,74",
        "2. OC 132371 (30.000,00 KG) CTE 1423/1424/1425 VLR R$ 6.300,00",
        "",
        "Valor Total a Quitar R$ 12.522,74",
        "Código 32982 – MOREIRA TRANSPORTES E LOG LTDA",
        "Pix: moreiratransportes21@gmail.com",
      ].join("\n"),
    );
  });

  it("adiantamento traz frete, percentual e total do adiantamento", () => {
    const t = gerarTextoComprovante({ adiantamentos: adts, modo: "adiantamento", transportadoras: transp }).replace(/\u00a0/g, " ");
    expect(t).toContain("ADIANTAMENTO DO FRETE CIF, FORA DO ESTADO.");
    expect(t).toContain("1. OC 132357 (29.512,80 KG) CTE 1397/1398 VLR R$ 31.113,72");
    expect(t).toContain("Valor Total do Frete R$ 62.613,72");
    expect(t).toContain("80% de Adiantamento");
    expect(t).toContain("Valor Total do Adiantamento R$ 50.090,98");
  });

  it("ignora cancelados", () => {
    const t = gerarTextoComprovante({
      adiantamentos: [...adts, mk({ numero: "X", status: "cancelado", valor_saldo: 999, cteNumbers: ["9"] })],
      modo: "quitacao",
      transportadoras: transp,
    });
    expect(t).not.toContain("/9 ");
    expect(t).toContain("12.522,74");
  });
});
