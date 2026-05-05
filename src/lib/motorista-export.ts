import * as XLSX from "xlsx";
import type { MotoristaAgg } from "@/hooks/useMotoristasPainel";
import { formatDuracao } from "@/lib/portaria-tempos";

function calcKm(m: any): number {
  if (m.km_rodado != null && Number(m.km_rodado) > 0) return Number(m.km_rodado);
  if (m.km_inicial != null && m.km_final != null) {
    const d = Number(m.km_final) - Number(m.km_inicial);
    return d > 0 && d < 5000 ? d : 0;
  }
  return 0;
}

function tempoMin(m: any): number | null {
  const ini = m.horario_real_saida;
  const fim = m.horario_real_retorno || m.horario_saida_final;
  if (!ini || !fim) return null;
  const d = (new Date(fim).getTime() - new Date(ini).getTime()) / 60000;
  return d > 0 ? Math.round(d) : null;
}

function fmtDateTimeBR(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateBR(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function categoriaLabel(c: string | null | undefined): string {
  if (c === "carga_propria") return "Varejo";
  if (c === "terceirizado") return "Distribuidores";
  return c || "";
}

function slug(s: string): string {
  return (s || "motorista")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

type Cell = { v: any; t?: "n" | "s"; z?: string };

const N1 = (v: number): Cell => ({ v, t: "n", z: "#,##0.0" });
const N0 = (v: number): Cell => ({ v, t: "n", z: "#,##0" });

export function exportarMotoristaXlsx(
  motorista: MotoristaAgg,
  periodo: { inicio: string; fim: string },
) {
  const wb = XLSX.utils.book_new();
  const cad = motorista.cadastro;
  const periodoLabel = `${fmtDateBR(periodo.inicio)} a ${fmtDateBR(periodo.fim)}`;

  // Ordena rotas (mesma lógica do print) — saídas e cargas próprias
  const rotas = motorista.movimentos
    .filter((i: any) => !!i.horario_real_saida || i.categoria === "carga_propria")
    .sort(
      (a: any, b: any) =>
        new Date(b.horario_real_saida || b.data_hora).getTime() -
        new Date(a.horario_real_saida || a.data_hora).getTime(),
    );

  // ============= Aba 1 — Resumo =============
  const resumoAoa: any[][] = [
    ["Histórico do Motorista"],
    [`Período: ${periodoLabel}`],
    [],
    ["Motorista", motorista.nome],
    ["CPF", cad?.cpf || ""],
    ["Telefone", cad?.telefone || ""],
    ["Status", motorista.em_rota ? "Em rota" : "Disponível"],
    ["Última atividade", fmtDateTimeBR(motorista.ultima_atividade)],
    [],
    ["KPIs do período"],
    [
      "Rotas",
      "KM total",
      "KM médio",
      "Tempo médio",
      "Peso total (kg)",
      "Peso médio (kg)",
      "Entregas",
      "Rotas c/ obs",
    ],
    [
      N0(motorista.rotas),
      N1(motorista.km_total),
      N1(motorista.km_medio),
      formatDuracao(motorista.tempo_medio_min ?? undefined),
      N0(motorista.peso_total),
      N0(motorista.peso_medio),
      N0(motorista.entregas_total),
      N0(motorista.obs_count),
    ],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoAoa);
  wsResumo["!cols"] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
  ];
  wsResumo["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 7 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // ============= Aba 2 — Rotas =============
  const rotasHeader = [
    "Data/Hora saída",
    "Data/Hora retorno",
    "Categoria",
    "Etapa",
    "Carga ID",
    "Rota",
    "Placa",
    "Tipo caminhão",
    "Empresa/Transportadora",
    "Conferente",
    "KM inicial",
    "KM final",
    "KM rodado",
    "Tempo (min)",
    "Tempo (hh:mm)",
    "Peso (kg)",
    "Qtd entregas",
    "Nº lacre",
    "Nota fiscal",
    "Doca/Setor",
    "Ocorrência",
    "Observações da portaria",
  ];

  let totKm = 0;
  let totPeso = 0;
  let totEntregas = 0;

  const rotasRows = rotas.map((r: any) => {
    const km = calcKm(r);
    const t = tempoMin(r);
    const fim = r.horario_real_retorno || r.horario_saida_final;
    const peso = Number(r.peso) || 0;
    const ent = Number(r.qtd_entregas) || 0;
    totKm += km;
    totPeso += peso;
    totEntregas += ent;
    const etapa = r.etapa_carga_propria || r.etapa_terceirizado || "";

    return [
      fmtDateTimeBR(r.horario_real_saida || r.data_hora),
      fmtDateTimeBR(fim),
      categoriaLabel(r.categoria),
      etapa,
      r.carga_id || "",
      r.rota || "",
      r.placa || "",
      r.tipo_caminhao || "",
      r.empresa || "",
      r.conferente || "",
      r.km_inicial != null ? N1(Number(r.km_inicial)) : "",
      r.km_final != null ? N1(Number(r.km_final)) : "",
      km > 0 ? N1(km) : "",
      t != null ? N0(t) : "",
      formatDuracao(t ?? undefined),
      peso > 0 ? N0(peso) : "",
      ent > 0 ? N0(ent) : "",
      r.numero_lacre || "",
      r.nota_fiscal || "",
      r.doca_setor || "",
      (r.ocorrencia || "").trim(),
      (r.observacoes || "").trim(),
    ];
  });

  const rotasAoa: any[][] = [rotasHeader, ...rotasRows];
  if (rotasRows.length > 0) {
    rotasAoa.push([]);
    const totalRow: any[] = new Array(rotasHeader.length).fill("");
    totalRow[0] = "TOTAIS";
    totalRow[12] = N1(totKm);
    totalRow[15] = N0(totPeso);
    totalRow[16] = N0(totEntregas);
    rotasAoa.push(totalRow);
  }
  const wsRotas = XLSX.utils.aoa_to_sheet(rotasAoa);
  wsRotas["!cols"] = [
    { wch: 17 }, // saída
    { wch: 17 }, // retorno
    { wch: 14 }, // categoria
    { wch: 14 }, // etapa
    { wch: 12 }, // carga
    { wch: 22 }, // rota
    { wch: 10 }, // placa
    { wch: 16 }, // tipo
    { wch: 22 }, // empresa
    { wch: 16 }, // conferente
    { wch: 12 }, // km ini
    { wch: 12 }, // km fim
    { wch: 12 }, // km rod
    { wch: 12 }, // tempo min
    { wch: 12 }, // tempo hh
    { wch: 12 }, // peso
    { wch: 12 }, // entregas
    { wch: 14 }, // lacre
    { wch: 14 }, // nota
    { wch: 14 }, // doca
    { wch: 40 }, // ocorrência
    { wch: 50 }, // obs
  ];
  XLSX.utils.book_append_sheet(wb, wsRotas, "Rotas");

  // ============= Aba 3 — Observações & Ocorrências =============
  const obsHeader = [
    "Data/Hora saída",
    "Placa",
    "Carga ID",
    "Tipo",
    "Texto completo",
    "Conferente",
  ];
  const obsRows: any[][] = [];
  for (const r of rotas as any[]) {
    const ocorr = (r.ocorrencia || "").trim();
    const obs = (r.observacoes || "").trim();
    if (ocorr) {
      obsRows.push([
        fmtDateTimeBR(r.horario_real_saida || r.data_hora),
        r.placa || "",
        r.carga_id || "",
        "Ocorrência",
        ocorr,
        r.conferente || "",
      ]);
    }
    if (obs) {
      obsRows.push([
        fmtDateTimeBR(r.horario_real_saida || r.data_hora),
        r.placa || "",
        r.carga_id || "",
        "Observação",
        obs,
        r.conferente || "",
      ]);
    }
  }
  const obsAoa: any[][] =
    obsRows.length > 0
      ? [obsHeader, ...obsRows]
      : [obsHeader, ["", "", "", "", "Nenhuma observação ou ocorrência no período.", ""]];
  const wsObs = XLSX.utils.aoa_to_sheet(obsAoa);
  wsObs["!cols"] = [
    { wch: 17 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 70 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsObs, "Observações");

  const filename = `motorista_${slug(motorista.nome)}_${periodo.inicio}_${periodo.fim}.xlsx`;
  XLSX.writeFile(wb, filename);
}
