

# Fluxo em Duas Etapas: Vendedora + Logística

## Conceito
O carregamento passa por duas etapas de preenchimento:
1. **Vendedora** cria o registro com dados comerciais: vendedor, produto, quantidade, peso, cidade, UF, observações
2. **Logística** complementa com dados operacionais: tipo de caminhão, placa, motorista, horário previsto, e gerencia os status/horários

## Alterações

### 1. Banco de Dados
- Adicionar coluna `etapa` na tabela `carregamentos_dia` (text, default `'vendas'`, valores: `'vendas'` ou `'logistica'`)
- Quando a logística preenche os dados de transporte, a etapa muda para `'logistica'`

### 2. Interface - Dois Formulários Distintos
- **Botão "Novo Carregamento"** abre formulário simplificado da vendedora: data, vendedor, código produto, quantidade, peso, cidade, UF, observações. Status inicial = "Aguardando". Etapa = "vendas"
- **Botão "Completar" na tabela** (visível quando etapa = "vendas"): abre formulário da logística com campos: tipo caminhão, placa, motorista, horário previsto. Ao salvar, etapa muda para "logistica"
- **Editar** continua funcionando para todos os campos

### 3. Indicador Visual na Tabela
- Badge indicando se o carregamento está na etapa "Vendas" (pendente de logística) ou "Logística" (completo)
- Campos de transporte não preenchidos aparecem com destaque visual (ex: texto cinza "Pendente")

### 4. Filtro por Etapa
- Adicionar filtro "Etapa" nos filtros existentes: Todos / Vendas (pendentes) / Logística (completos)
- Permite a logística ver rapidamente o que precisa ser completado

### 5. KPI Adicional
- Card "Pendentes Logística" mostrando quantos carregamentos ainda estão na etapa de vendas aguardando dados de transporte

---

### Detalhes Técnicos
- Migração SQL: `ALTER TABLE carregamentos_dia ADD COLUMN etapa text NOT NULL DEFAULT 'vendas'`
- `CarregamentoDialog` será refatorado para aceitar um `mode: 'vendas' | 'logistica' | 'editar'` que controla quais campos são exibidos
- Novo componente `LogisticaDialog` ou reutilização do mesmo dialog com campos condicionais

