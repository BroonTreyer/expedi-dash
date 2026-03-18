

# Redesign Completo: Controle de Portaria Universal

## Problema Atual
A portaria atual depende 100% da tabela `carregamentos_dia` — só exibe veículos com `carga_id`. Isso ignora veículos de fornecedores, visitantes, prestadores de serviço, entregas avulsas, etc.

## Visão Geral da Solução

Criar um sistema de portaria independente e completo, onde **qualquer veículo** pode ser registrado na entrada ou saída, com ou sem vínculo a uma carga do sistema.

---

## 1. Banco de Dados

### Nova tabela: `movimentacoes_portaria`

Substitui a lógica atual de `registros_portaria` (que será mantida para histórico, mas o novo fluxo usa esta tabela):

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| tipo_movimento | text NOT NULL | `entrada` ou `saida` |
| categoria | text NOT NULL | `carga_propria`, `fornecedor`, `visitante`, `prestador`, `outros` |
| placa | text | Placa do veículo |
| motorista | text | Nome do motorista |
| empresa | text | Empresa/transportadora |
| destino_setor | text | Setor de destino (expedição, recebimento, administrativo, etc.) |
| motivo | text | Motivo da visita/entrada |
| carga_id | text NULL | Vínculo opcional com carga do sistema |
| foto_placa_url | text NULL | Evidência fotográfica |
| texto_placa_lido | text NULL | OCR da placa |
| confianca_placa | numeric NULL | Confiança OCR |
| placa_confirmada | text NULL | Placa confirmada pelo operador |
| foto_documento_url | text NULL | Foto de documento/NF |
| observacoes | text NULL | |
| usuario_id | uuid NULL | Quem registrou |
| data_hora | timestamptz NOT NULL DEFAULT now() | Momento do registro |
| movimento_vinculado_id | uuid NULL FK self | Liga entrada ao registro de saída correspondente |
| created_at | timestamptz DEFAULT now() | |

RLS: authenticated para todas as operações (SELECT, INSERT, UPDATE, DELETE).

---

## 2. Página Redesenhada

### Header + Filtro de Data
- Título "Controle de Portaria" com subtítulo
- Seletor de data (calendário)
- Botao principal "Registrar Movimento" (destaque)

### KPI Cards (4 cards)
- **Entradas Hoje**: contagem de movimentos tipo `entrada`
- **Saídas Hoje**: contagem de movimentos tipo `saida`
- **Veículos no Pátio**: entradas sem saída correspondente (ainda dentro)
- **Total de Movimentos**: total do dia

### Abas de Visualização
- **Aba "Pátio Atual"**: veículos que entraram mas ainda não saíram — acao rápida de registrar saída
- **Aba "Histórico do Dia"**: timeline de todos os movimentos em ordem cronológica

### Tabela Principal (em cada aba)
Colunas: Hora | Tipo (badge entrada/saída) | Categoria (badge colorido) | Placa | Motorista | Empresa | Setor | Carga (se vinculada) | Ações

### Filtros
- Busca por placa, motorista, empresa
- Filtro por categoria (carga própria, fornecedor, visitante, etc.)
- Filtro por tipo (entrada/saída)

---

## 3. Dialog "Registrar Movimento"

Formulário completo com:
1. **Tipo**: Entrada ou Saída (toggle)
2. **Categoria**: Select (carga própria, fornecedor, visitante, prestador, outros)
3. **Placa**: Input com botao de foto + OCR (opcional)
4. **Motorista**: Input texto
5. **Empresa/Transportadora**: Input texto
6. **Setor de destino**: Select (Expedição, Recebimento, Administrativo, Manutenção, Outros)
7. **Motivo**: Input texto
8. **Vínculo com Carga**: Autocomplete opcional (busca cargas do dia)
9. **Foto da placa**: Captura com OCR automático (opcional, não obrigatório)
10. **Foto de documento/NF**: Captura opcional
11. **Observações**: Textarea

Para **saída** de veículo que está no pátio: pré-preenche dados da entrada, pedindo apenas confirmação.

---

## 4. Componentes Reutilizados
- `CapturaFoto` — mantido como está
- `OcrResultado` — mantido como está
- Edge function `ocr-portaria` — mantida como está

## 5. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabela `movimentacoes_portaria` |
| `src/hooks/useMovimentacoesPortaria.ts` | Novo hook CRUD |
| `src/pages/Portaria.tsx` | Reescrever completamente |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Novo dialog de registro |
| `src/components/portaria/PortariaKpiCards.tsx` | Atualizar para novos KPIs |
| `src/components/portaria/PatioAtualTab.tsx` | Nova aba de pátio |
| `src/components/portaria/HistoricoTab.tsx` | Nova aba de histórico |
| `src/components/portaria/EvidenciasViewer.tsx` | Adaptar para novo modelo |

Os componentes antigos (`RegistroPortariaDialog.tsx`) serão substituídos. O hook `useRegistrosPortaria.ts` e a tabela `registros_portaria` ficam no código para não perder dados históricos.

