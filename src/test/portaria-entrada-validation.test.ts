import { describe, expect, it } from "vitest";
import { validarLiberacaoEntrada } from "@/lib/portaria-entrada-validation";

const chegada = {
  categoria: "terceirizado",
  horario_entrada: null,
  horario_saida_final: null,
  etapa_terceirizado: "chegada",
  etapa_carga_propria: null,
};

describe("liberação de entrada", () => {
  it("permite uma chegada de Distribuidores com transportadora", () => {
    expect(() => validarLiberacaoEntrada(chegada, "Transportadora")).not.toThrow();
  });
  it("bloqueia a mistura de chegada de Distribuidores com carga do Varejo", () => {
    expect(() => validarLiberacaoEntrada(chegada, null)).toThrow("categorias diferentes");
    expect(() => validarLiberacaoEntrada(chegada, "  ")).toThrow("categorias diferentes");
  });
  it("permite chegada do Varejo sem transportadora", () => {
    expect(() => validarLiberacaoEntrada({ ...chegada, categoria: "carga_propria", etapa_terceirizado: null, etapa_carga_propria: "chegou" }, null)).not.toThrow();
  });
  it("não sobrescreve uma entrada já liberada", () => {
    expect(() => validarLiberacaoEntrada({ ...chegada, horario_entrada: "2026-10-09T13:06:15Z" }, "Transportadora")).toThrow("já foi liberada");
  });
  it("não reabre movimentos finalizados", () => {
    expect(() => validarLiberacaoEntrada({ ...chegada, etapa_terceirizado: "finalizado" }, "Transportadora")).toThrow("finalizado");
  });
});