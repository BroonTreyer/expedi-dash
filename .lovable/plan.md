

# Controle de Portaria — Evidência Fotográfica e OCR de Placa/KM

## Visão geral

Criar um módulo completo de portaria com captura de fotos, leitura automática via IA (OCR), validação de placa e KM, e dashboard de indicadores. O fluxo é otimizado para uso rápido em celular/tablet na portaria.

## Arquitetura

```text
┌─────────────┐    foto     ┌──────────────────┐    OCR     ┌─────────────────┐
│  Câmera do  │ ──────────► │  Storage Bucket  │ ──────────►│  Edge Function  │
│  dispositivo│             │  "portaria"      │            │  "ocr-portaria" │
└─────────────┘             └──────────────────┘            │  (Gemini Flash) │
                                                            └────────┬────────┘
                                                                     │
                                                           {placa, km, confiança}
                                                                     │
                                                            ┌────────▼────────┐
                                                            │  Tela confirma  │
                                                            │  valores lidos  │
                                                            └────────┬────────┘
                                                                     │
                                                            ┌────────▼────────┐
                                                            │  registros_     │
                                                            │  portaria (DB)  │
                                                            └─────────────────┘
```

## 1. Banco de dados

**Nova tabela `registros_portaria`** (migration):

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| carga_id | text NOT NULL | FK lógica para carregamentos_dia |
| tipo_registro | text NOT NULL | 'saida' ou 'retorno' |
| placa_prevista | text | placa esperada da carga |
| foto_placa_url | text | path no storage |
| texto_placa_lido | text | OCR |
| confianca_placa | numeric | 0-100 |
| foto_km_url | text | path no storage |
| km_lido | numeric | OCR |
| confianca_km | numeric | 0-100 |
| km_confirmado | numeric | valor final pelo usuário |
| placa_confirmada | text | valor final pelo usuário |
| km_rodado_real | numeric | calculado (retorno - saida) |
| divergencia_placa | boolean | placa lida ≠ prevista |
| divergencia_km | boolean | km suspeito |
| status_validacao | text | 'confirmada', 'parcial', 'divergente', 'corrigida', 'imagem_invalida', 'pendente' |
| leitura_modo | text | 'automatica' ou 'manual' |
| usuario_id | uuid | quem registrou |
| created_at | timestamptz | |

- RLS: authenticated pode SELECT/INSERT/UPDATE.
- Constraint CHECK em `tipo_registro` IN ('saida','retorno').
- Constraint CHECK em `status_validacao` IN (...).

**Storage bucket `portaria`** (público para leitura):

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('portaria', 'portaria', true);
```

Com policy para authenticated fazer upload.

**Adicionar `status_validacao_portaria` na constraint de `carregamentos_dia.status`** não é necessário — portaria é tabela separada.

## 2. Edge Function `ocr-portaria`

Usa Lovable AI (Gemini Flash) para analisar imagens:

- Recebe: `imageUrl`, `tipo` ('placa' ou 'km')
- Envia imagem para `google/gemini-2.5-flash` com prompt específico:
  - Para placa: "Leia a placa do veículo nesta imagem. Retorne o texto da placa e um nível de confiança 0-100."
  - Para KM: "Leia o valor do odômetro/quilometragem nesta imagem. Retorne o valor numérico e confiança 0-100."
- Usa tool calling para structured output
- Retorna: `{ texto, confianca }`

Config em `supabase/config.toml`:
```toml
[functions.ocr-portaria]
verify_jwt = false
```

## 3. Página `/portaria`

Nova rota acessível por roles `admin` e `logistica`.

### Interface

**Tela principal**: Lista de cargas do dia (da tabela `carregamentos_dia` com `carga_id` preenchido), mostrando:
- Placa, motorista, tipo caminhão, status portaria
- Botões "Registrar Saída" / "Registrar Retorno"
- Ícone para ver evidências já registradas

**Fluxo de registro (dialog/sheet fullscreen mobile)**:

1. Botão "Tirar foto da placa" → abre câmera (`<input type="file" accept="image/*" capture="environment">`)
2. Preview da foto → botão "Processar"
3. Chamada à edge function OCR → exibe resultado com confiança
4. Campo editável para confirmar/corrigir placa
5. Alerta se placa ≠ placa prevista
6. Botão "Tirar foto do KM" → mesma mecânica
7. Campo editável para confirmar/corrigir KM
8. Se retorno: calcula KM rodado automaticamente (km_retorno - km_saida)
9. Alerta se KM final < KM inicial
10. Botão "Confirmar e Salvar"

### Componentes novos

- `src/pages/Portaria.tsx` — página principal
- `src/components/portaria/RegistroPortariaDialog.tsx` — dialog de registro saída/retorno
- `src/components/portaria/CapturaFoto.tsx` — componente de captura de foto com preview
- `src/components/portaria/OcrResultado.tsx` — exibição do resultado OCR com badge de confiança
- `src/components/portaria/EvidenciasViewer.tsx` — visualização das fotos salvas
- `src/components/portaria/PortariaKpiCards.tsx` — KPIs do dashboard
- `src/hooks/useRegistrosPortaria.ts` — hook para CRUD da tabela

## 4. Dashboard de indicadores

Na página `/portaria`, cards KPI no topo:
- Viagens com evidência completa
- Leituras divergentes
- Correções manuais
- Veículos com maior divergência KM (tabela resumida)

## 5. Navegação

Adicionar item "Portaria" no `AppSidebar.tsx` com ícone `DoorOpen` (lucide), roles: `["admin", "logistica"]`.

Adicionar rota em `App.tsx`:
```tsx
<Route path="/portaria" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><Portaria /></ProtectedRoute>} />
```

## 6. Regras de validação (implementadas no frontend)

- Placa lida ≠ placa prevista → badge "Divergência de veículo" (amarelo)
- KM final < KM inicial → badge "Leitura suspeita" (vermelho)
- Confiança < 70% → exige confirmação manual obrigatória
- Fotos obrigatórias para finalizar registro
- OCR nunca é fonte final — sempre passa por confirmação humana

## Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `registros_portaria` + bucket storage |
| `supabase/functions/ocr-portaria/index.ts` | Criar edge function OCR |
| `supabase/config.toml` | Adicionar config da function |
| `src/pages/Portaria.tsx` | Criar página |
| `src/components/portaria/*.tsx` | 5 componentes novos |
| `src/hooks/useRegistrosPortaria.ts` | Criar hook |
| `src/components/AppSidebar.tsx` | Adicionar link Portaria |
| `src/App.tsx` | Adicionar rota |

