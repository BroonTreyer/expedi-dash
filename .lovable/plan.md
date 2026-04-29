
## Objetivo

Permitir exportar para `.xlsx` o histórico completo do motorista exibido no Painel de Motoristas — bem dividido por abas, células e colunas, incluindo todas as observações e ocorrências, **sem fotos**.

## Onde aparece o botão

No `MotoristaDetalheDrawer.tsx`, ao lado do botão **Imprimir** (header do drawer), adicionar um novo botão **Exportar Excel** (ícone `FileSpreadsheet`). A exportação usa o motorista atualmente selecionado e o mesmo intervalo de datas (`periodo.inicio` / `periodo.fim`) já passado para o `MotoristaPrintDialog`.

## Conteúdo do arquivo Excel

Nome do arquivo: `motorista_<nome-slug>_<inicio>_<fim>.xlsx`.

O workbook terá **3 abas**:

### Aba 1 — Resumo
Cabeçalho institucional + dados do motorista + KPIs do período (mesmos números já mostrados na tela).

```text
Histórico do Motorista
Período: dd/mm/aaaa a dd/mm/aaaa

Motorista: <nome>
CPF: <cpf>
Telefone: <telefone>
Status: Em rota / Disponível
Última atividade: dd/mm/aaaa hh:mm

KPIs
Rotas | KM total | KM médio | Tempo médio | Peso total (kg) | Peso médio (kg) | Entregas | Rotas c/ obs
```

### Aba 2 — Rotas (uma linha por rota)
Colunas (cada uma em sua célula, formatos pt-BR):

1. Data/Hora saída
2. Data/Hora retorno
3. Categoria (Frota Própria / Terceirizado / outros)
4. Etapa
5. Carga ID
6. Rota
7. Placa
8. Tipo caminhão
9. Empresa / Transportadora
10. Conferente
11. KM inicial
12. KM final
13. KM rodado
14. Tempo (min)
15. Tempo (hh:mm)
16. Peso (kg)
17. Qtd entregas
18. Nº lacre
19. Nota fiscal
20. Doca/Setor
21. Ocorrência
22. Observações da portaria

Linha final de **Totais** (KM rodado, Peso, Entregas) e contagens.

### Aba 3 — Observações & Ocorrências
Apenas as rotas em que `observacoes` ou `ocorrencia` estão preenchidos, em formato leitura-fácil:

Colunas: Data/Hora saída · Placa · Carga ID · Tipo (Ocorrência / Observação) · Texto completo · Conferente.

Cada observação/ocorrência vira **uma linha** (uma rota com ambos gera duas linhas).

## Detalhes técnicos

- Lib: `xlsx` (já usada em `useRelatorios.ts`) — sem nova dependência.
- Criar `src/lib/motorista-export.ts` exportando `exportarMotoristaXlsx(motorista: MotoristaAgg, periodo: { inicio: string; fim: string })`.
  - Reusa as funções `calcKm` / `tempoMin` (copiadas do `MotoristaPrintDialog`) para coerência total entre impressão e Excel.
  - Usa `XLSX.utils.aoa_to_sheet` para cada aba, define `!cols` (largura por coluna) e `!merges` para títulos do Resumo.
  - Datas/horas: gravadas como string formatada pt-BR (`dd/MM/yyyy HH:mm`) — mesmo padrão do `useRelatorios.ts` —, garantindo legibilidade direta no Excel sem depender de locale.
  - Números (KM, peso): gravados como `Number` real com `t: "n"` e `z: '#,##0.0'` / `'#,##0'` para formatação pt-BR no Excel.
  - Fotos: **omitidas** — nenhuma URL de imagem é exportada.
- `XLSX.writeFile(wb, filename)` dispara o download.

## Mudança no UI

Em `src/components/motoristas/MotoristaDetalheDrawer.tsx`:
- Importar `FileSpreadsheet` de `lucide-react` e `exportarMotoristaXlsx`.
- Adicionar `<Button variant="outline" size="sm" onClick={() => exportarMotoristaXlsx(motorista, periodo)}>` ao lado do botão Imprimir, com label `Excel`.
- Mostrar `toast.success("Excel gerado")` (sonner já é usado no projeto).

## Memória

Atualizar `mem/features/drivers-panel.md` adicionando a frase: "Drawer também exporta `.xlsx` (3 abas: Resumo, Rotas, Observações) via `xlsx`, sem fotos, formato pt-BR."

## Arquivos

Criar:
- `src/lib/motorista-export.ts`

Editar:
- `src/components/motoristas/MotoristaDetalheDrawer.tsx`
- `mem/features/drivers-panel.md`

Sem mudanças em schema, RLS, edge functions ou rotas.
