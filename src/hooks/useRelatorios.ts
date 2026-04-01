import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { format } from "date-fns";

async function fetchCarregamentos(dataInicio: string, dataFim: string) {
  const { data, error } = await supabase
    .from("carregamentos_dia")
    .select("*, vendedores(nome_vendedor)")
    .gte("data", dataInicio)
    .lte("data", dataFim)
    .order("data", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchMovimentacoes(dataInicio: string, dataFim: string) {
  const { data, error } = await supabase
    .from("movimentacoes_portaria")
    .select("*")
    .gte("data_hora", `${dataInicio}T00:00:00`)
    .lte("data_hora", `${dataFim}T23:59:59`)
    .order("data_hora", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export async function gerarResumoDiario(dataInicio: string, dataFim: string) {
  const rows = await fetchCarregamentos(dataInicio, dataFim);
  
  // Agrupar por carga
  const cargas = new Map<string, { nome_carga: string; placa: string; motorista: string; transportadora: string; tipo_caminhao: string; data: string; status: string; etapa: string; peso_total: number; qtd_pedidos: number; clientes: Set<string>; ufs: Set<string> }>();
  
  for (const r of rows) {
    const key = r.carga_id || r.id;
    if (!cargas.has(key)) {
      cargas.set(key, {
        nome_carga: r.nome_carga || "",
        placa: r.placa || "",
        motorista: r.motorista || "",
        transportadora: r.transportadora || "",
        tipo_caminhao: r.tipo_caminhao || "",
        data: r.data,
        status: r.status,
        etapa: r.etapa,
        peso_total: 0,
        qtd_pedidos: 0,
        clientes: new Set(),
        ufs: new Set(),
      });
    }
    const c = cargas.get(key)!;
    c.peso_total += Number(r.peso) || 0;
    c.qtd_pedidos += 1;
    if (r.cliente) c.clientes.add(r.cliente);
    if (r.uf) c.ufs.add(r.uf);
  }

  const sheetData = [
    ["Resumo Diário de Expedição", "", "", "", "", "", "", "", "", ""],
    [`Período: ${format(new Date(dataInicio + "T12:00"), "dd/MM/yyyy")} a ${format(new Date(dataFim + "T12:00"), "dd/MM/yyyy")}`],
    [],
    ["Data", "Carga", "Placa", "Motorista", "Transportadora", "Tipo Caminhão", "Peso Total (kg)", "Qtd Pedidos", "Clientes", "UFs"],
  ];

  for (const [, c] of cargas) {
    sheetData.push([
      c.data,
      c.nome_carga,
      c.placa,
      c.motorista,
      c.transportadora,
      c.tipo_caminhao,
      c.peso_total.toFixed(2),
      String(c.qtd_pedidos),
      Array.from(c.clientes).join(", "),
      Array.from(c.ufs).join(", "),
    ]);
  }

  // Totais
  const totalPeso = Array.from(cargas.values()).reduce((s, c) => s + c.peso_total, 0);
  const totalPedidos = Array.from(cargas.values()).reduce((s, c) => s + c.qtd_pedidos, 0);
  sheetData.push([]);
  sheetData.push(["", "", "", "", "", "TOTAL", totalPeso.toFixed(2), String(totalPedidos), "", ""]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 30 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Resumo");
  downloadWorkbook(wb, `resumo_expedicao_${dataInicio}_${dataFim}.xlsx`);
}

export async function gerarRelatorioRupturas(dataInicio: string, dataFim: string) {
  const rows = await fetchCarregamentos(dataInicio, dataFim);
  const rupturas = rows.filter((r) => r.ruptura);

  const sheetData = [
    ["Relatório de Rupturas"],
    [`Período: ${format(new Date(dataInicio + "T12:00"), "dd/MM/yyyy")} a ${format(new Date(dataFim + "T12:00"), "dd/MM/yyyy")}`],
    [`Total: ${rupturas.length} ruptura(s) de ${rows.length} pedidos (${rows.length > 0 ? ((rupturas.length / rows.length) * 100).toFixed(1) : 0}%)`],
    [],
    ["Data", "Pedido", "Produto", "Cód. Produto", "Cliente", "Cód. Cliente", "Vendedor", "Quantidade", "Peso", "Observações"],
  ];

  for (const r of rupturas) {
    sheetData.push([
      r.data,
      String(r.numero_pedido || ""),
      r.nome_produto || "",
      r.codigo_produto || "",
      r.cliente || "",
      r.codigo_cliente || "",
      (r as any).vendedores?.nome_vendedor || "",
      String(r.quantidade || 0),
      String(r.peso || 0),
      r.observacoes || "",
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Rupturas");
  downloadWorkbook(wb, `rupturas_${dataInicio}_${dataFim}.xlsx`);
}

export async function gerarPerformanceVendedores(dataInicio: string, dataFim: string) {
  const rows = await fetchCarregamentos(dataInicio, dataFim);

  const vendedores = new Map<string, { nome: string; peso_total: number; qtd_pedidos: number; rupturas: number; cargas: Set<string> }>();

  for (const r of rows) {
    const nome = (r as any).vendedores?.nome_vendedor || "Sem vendedor";
    if (!vendedores.has(nome)) {
      vendedores.set(nome, { nome, peso_total: 0, qtd_pedidos: 0, rupturas: 0, cargas: new Set() });
    }
    const v = vendedores.get(nome)!;
    v.peso_total += Number(r.peso) || 0;
    v.qtd_pedidos += 1;
    if (r.ruptura) v.rupturas += 1;
    if (r.carga_id) v.cargas.add(r.carga_id);
  }

  const sorted = Array.from(vendedores.values()).sort((a, b) => b.peso_total - a.peso_total);

  const sheetData = [
    ["Performance por Vendedor"],
    [`Período: ${format(new Date(dataInicio + "T12:00"), "dd/MM/yyyy")} a ${format(new Date(dataFim + "T12:00"), "dd/MM/yyyy")}`],
    [],
    ["Ranking", "Vendedor", "Peso Total (kg)", "Qtd Pedidos", "Qtd Cargas", "Rupturas", "Taxa Ruptura (%)"],
  ];

  sorted.forEach((v, i) => {
    sheetData.push([
      String(i + 1),
      v.nome,
      v.peso_total.toFixed(2),
      String(v.qtd_pedidos),
      String(v.cargas.size),
      String(v.rupturas),
      v.qtd_pedidos > 0 ? ((v.rupturas / v.qtd_pedidos) * 100).toFixed(1) : "0.0",
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [{ wch: 10 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Vendedores");
  downloadWorkbook(wb, `vendedores_${dataInicio}_${dataFim}.xlsx`);
}

export async function gerarTempoMedioPatio(dataInicio: string, dataFim: string) {
  const movs = await fetchMovimentacoes(dataInicio, dataFim);

  const entradas = movs.filter((m) => m.tipo_movimento === "entrada");
  const saidasMap = new Map<string, typeof movs[0]>();
  for (const m of movs) {
    if (m.tipo_movimento === "saida" && m.movimento_vinculado_id) {
      saidasMap.set(m.movimento_vinculado_id, m);
    }
  }

  const transportadoras = new Map<string, { total_minutos: number; count: number }>();

  for (const e of entradas) {
    const saida = saidasMap.get(e.id);
    if (!saida) continue;
    const entrada = new Date(e.data_hora).getTime();
    const saidaTime = new Date(saida.data_hora).getTime();
    const minutos = (saidaTime - entrada) / 60000;
    if (minutos <= 0 || minutos > 1440) continue;

    const transp = e.empresa || "N/I";
    if (!transportadoras.has(transp)) transportadoras.set(transp, { total_minutos: 0, count: 0 });
    const t = transportadoras.get(transp)!;
    t.total_minutos += minutos;
    t.count += 1;
  }

  const sorted = Array.from(transportadoras.entries())
    .map(([nome, v]) => ({ nome, media: v.total_minutos / v.count, count: v.count }))
    .sort((a, b) => b.media - a.media);

  const sheetData = [
    ["Tempo Médio de Pátio por Transportadora"],
    [`Período: ${format(new Date(dataInicio + "T12:00"), "dd/MM/yyyy")} a ${format(new Date(dataFim + "T12:00"), "dd/MM/yyyy")}`],
    [],
    ["Transportadora", "Tempo Médio (min)", "Tempo Médio (hh:mm)", "Qtd Veículos"],
  ];

  for (const t of sorted) {
    const hh = Math.floor(t.media / 60);
    const mm = Math.round(t.media % 60);
    sheetData.push([t.nome, t.media.toFixed(0), `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, String(t.count)]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Tempo Pátio");
  downloadWorkbook(wb, `tempo_patio_${dataInicio}_${dataFim}.xlsx`);
}
