

# Portaria 500x Melhor — Sistema Fluido, Prático e Inteligente

## Problemas Atuais
- Dialog de registro com muitos campos visíveis de uma vez — sobrecarrega o operador
- Sem registro rápido (entrada express para fluxo de alta velocidade)
- Sem tempo de permanência no pátio
- Sem autocompletar de placa (placas recorrentes)
- Formulário não reseta `prefill` ao reabrir (bug com useState inicial)
- Sem skeleton/loading state na página
- Sem contagem em tempo real nas abas
- Sem confirmação visual ao registrar saída rápida do pátio
- Sem formatação automática de placa (Mercosul ABC1D23)
- Sem indicador de tempo no pátio (ex: "há 2h35")
- Tabela de pátio sem destaque visual para veículos com muito tempo

## Melhorias Planejadas

### 1. Registro Express (Entrada Rápida)
- Botão "Entrada Rápida" no header que abre um mini-form inline (não dialog) apenas com: **Placa + Categoria**
- Um clique e o veículo já está registrado — campos opcionais podem ser editados depois
- Ideal para portarias com alto volume

### 2. Dialog de Registro Redesenhado com Steps
- Dividir o formulário em **2 etapas**:
  - **Step 1**: Tipo + Categoria + Placa (essencial)
  - **Step 2**: Motorista, Empresa, Setor, Motivo, Fotos, Obs (opcional, expansível)
- Seção opcional colapsada por padrão com "Adicionar mais detalhes"
- Fix do bug de prefill (useEffect para sincronizar estado quando prefill muda)

### 3. Autocompletar de Placa Inteligente
- Ao digitar a placa, buscar últimas entradas dessa placa na tabela `movimentacoes_portaria`
- Pré-preencher motorista, empresa, categoria automaticamente baseado no último registro
- Badge "Recorrente" se placa já tem 3+ registros

### 4. Tempo de Permanência no Pátio
- Coluna "Tempo no Pátio" na aba Pátio Atual com timer relativo (ex: "1h 23min")
- Destaque amarelo > 4h, vermelho > 8h (cores configuráveis)
- Atualiza a cada minuto via `useEffect` com intervalo

### 5. Saída Rápida do Pátio
- Botão "Saída" no pátio abre confirmação inline (não dialog) com dados pré-preenchidos
- Um clique confirma e registra a saída vinculada
- Feedback visual com animação de linha saindo

### 6. KPIs Melhorados
- Adicionar **tempo médio de permanência** como 5º KPI
- Animação de contagem nos números (count-up)
- Indicador de tendência vs dia anterior (seta ↑↓)

### 7. Loading & Empty States
- Skeleton loading nos KPIs e tabelas enquanto dados carregam
- Empty state com ilustração e CTA para registrar primeiro movimento
- Indicador de loading inline na busca

### 8. Formatação Automática de Placa
- Máscara de input para placa no padrão Mercosul (ABC1D23) com auto-uppercase
- Validação visual inline (verde = formato válido, vermelho = inválido)

### 9. Contagem nas Abas
- Badge com contagem ao lado do nome da aba: "Pátio Atual (5)" / "Histórico (23)"

### 10. Realtime
- Habilitar realtime na tabela `movimentacoes_portaria` para sincronização entre operadores

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| Migration SQL | `ALTER PUBLICATION supabase_realtime ADD TABLE movimentacoes_portaria` |
| `src/pages/Portaria.tsx` | Registro express inline, contagem nas abas, loading states |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Steps, autocompletar placa, fix prefill, máscara placa |
| `src/components/portaria/PatioAtualTab.tsx` | Tempo de permanência, destaque visual, saída rápida inline |
| `src/components/portaria/HistoricoTab.tsx` | Loading/empty states |
| `src/components/portaria/PortariaKpiCards.tsx` | Tempo médio, skeleton loading |
| `src/hooks/useMovimentacoesPortaria.ts` | Hook de autocompletar placa, realtime subscription |

