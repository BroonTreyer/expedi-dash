## Objetivo

Tornar visíveis no Painel de Motoristas as observações registradas pela portaria/logística/admin (ex.: "celular da portaria bugou", explicando atrasos, falta de KM, baixas tardias) — e permitir imprimir o histórico completo do motorista para auditoria.

## Onde estão os dados (já existem no banco)

A tabela `movimentacoes_portaria` já possui dois campos textuais que cobrem o cenário, mas hoje só `ocorrencia` aparece (parcialmente) no drawer:

- `observacoes` — texto livre digitado em qualquer dialog (entrada, edição, walk-in).
- `ocorrencia` — texto de ocorrência operacional registrada pela portaria.

Nenhuma mudança de schema é necessária.

## Mudanças

### 1. Drawer de detalhe (`MotoristaDetalheDrawer.tsx`)

Em cada card de rota do histórico:

- Mostrar **ambos** os campos quando preenchidos, com rótulos claros:
  - "Ocorrência" (ícone amarelo de alerta) — já existe, mantém.
  - "Observações da portaria" (novo bloco, ícone de mensagem, fundo `bg-muted/40`).
- Adicionar um indicador visual no cabeçalho da rota ("Tem observação") quando qualquer um dos dois estiver preenchido, para facilitar varredura.
- Mostrar também o campo `conferente` (quem deu baixa) e o `usuario_id` resolvido como e-mail quando disponível, ajudando a entender o horário/responsável da baixa.

### 2. Sinal na tabela de ranking (`MotoristaRankingTable.tsx`)

- Adicionar um pequeno badge "⚠ obs" ao lado do nome quando o motorista tiver pelo menos uma rota no período com `observacoes` ou `ocorrencia` preenchidos. Tooltip com a contagem (ex.: "3 rotas com observação").
- Adicionar essa contagem ao agregado em `useMotoristasPainel.ts` (`obs_count: number`), calculada percorrendo `items` — sem nova query.

### 3. Impressão completa do motorista (novo)

Criar um botão "Imprimir histórico" no header do drawer que abre um diálogo de impressão A4 padrão (mesmo estilo dos `CargaPrintDialog` / `ConsolidadoPrintDialog`), contendo:

- **Cabeçalho:** nome, CPF, telefone, foto (se houver), período do filtro aplicado, KPIs agregados (rotas, KM total, KM médio, tempo médio, peso, entregas).
- **Tabela cronológica de rotas** (ordem decrescente), com colunas: data, placa, carga, rota, KM (ini→fim ou rodado), saída real, retorno real, peso, entregas, conferente.
- **Coluna/seção de observações:** abaixo de cada linha, em fonte menor, imprimir `ocorrencia` e `observacoes` por extenso (não truncar). Linhas sem texto ficam compactas.
- Rodapé com data/hora da impressão e usuário logado.

Arquivo novo: `src/components/motoristas/MotoristaPrintDialog.tsx` (segue padrão dos demais print dialogs do projeto, `window.print()` com CSS `@media print`).

### 4. Memória

Atualizar `mem://features/drivers-panel.md` para registrar que o painel exibe `observacoes` + `ocorrencia` por rota e oferece impressão A4 do histórico completo do motorista.

## Detalhes técnicos

- Ajustar `MotoristaAgg` em `useMotoristasPainel.ts` adicionando `obs_count: number` (computado no `for` que já agrega rotas — custo zero adicional).
- Reaproveitar `formatDuracao`, `calcKm`, `tempoMin` do drawer para o print dialog (extrair para `src/lib/motorista-utils.ts` se houver duplicação).
- Print dialog usa `react-to-print`-style via `window.print()` com `@media print { ... }` no próprio componente, igual aos existentes (sem nova dependência).
- Sem alterações em RLS — os campos já são lidos pela política `Ops select movimentacoes_portaria` (admin/logística/portaria).

## Arquivos

- Editar: `src/components/motoristas/MotoristaDetalheDrawer.tsx`
- Editar: `src/components/motoristas/MotoristaRankingTable.tsx`
- Editar: `src/hooks/useMotoristasPainel.ts`
- Criar: `src/components/motoristas/MotoristaPrintDialog.tsx`
- Editar: `mem/features/drivers-panel.md`
