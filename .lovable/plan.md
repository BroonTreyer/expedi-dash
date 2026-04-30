## Contexto

O CELIO ALVES OLIVEIRA já está visível corretamente após as correções anteriores (registro `e1406a61...` está com `data_referencia=2026-04-30`, `grupo=TERCEIRIZADO`, `conferido=false`, `placa=RSB1H70`). Verifiquei no banco e o registro está íntegro.

Porém, mapeando todo o código, ainda existem **dois pontos** que filtram apenas por `carga_id` (sem checar a placa). Quando um `carga_id` é reutilizado (caso "JR" — FAGNO 27/04 e CELIO 30/04), eles podem cruzar dados antigos com a operação atual e causar bugs sutis.

## Problemas remanescentes a corrigir

### 1. `src/pages/Expedicao.tsx` — `cargasComMotoristaChegado`
Hoje monta um `Set<carga_id>` a partir das movimentações do dia. Se houver qualquer movimento antigo do mesmo `carga_id` entrando em `chegouOuNoPatio`, a carga atual de CELIO some do painel "Cargas Fechadas Aguardando" e some do painel "A Chegar".

**Correção:** mudar para `Set<"carga_id|placa_normalizada">` e cruzar com a placa esperada da carga / do veículo previsto.

### 2. `CargasFechadasAguardandoPanel.tsx` — `liberarEntrada`
Faz `update veiculos_esperados ... where carga_id = c.carga_id` sem filtrar por placa. Como o gatilho corrigido só mantém um `previsto/conferido=false` por `carga_id`, hoje funciona — mas é defesa em profundidade somar `eq("placa", c.placa)` (ou `ilike` normalizado) para nunca marcar conferido um registro de outro veículo.

## O que NÃO precisa mudar

- `useStatusPortariaPorCarga` — já recebe `placa` dos chamadores (Expedicao e Consolidado) e filtra corretamente.
- `useCargasFechadasAguardando` — já cruza placa + janela ±48h em volta da `data` da carga.
- Trigger `on_carga_fechada` / `vincular_veiculo_esperado_tardio` — já corrigido para considerar somente registros pendentes (`conferido=false`).
- Registro do CELIO — já existe e visível em "Esperados" (Terceirizado) e nos painéis de Registro de Entrada.

## Plano de implementação

1. **Refatorar `cargasComMotoristaChegado` em `src/pages/Expedicao.tsx`**:
   - Trocar `Set<string>` por `Set<"cargaId|placa">`.
   - Ao filtrar `cargasFechadas` e `veiculosEsperados`, montar a chave usando a placa daquela carga / veículo. Se a carga não tiver placa prevista, manter o comportamento atual (matching só por `carga_id`).

2. **Tighten `liberarEntrada` em `src/components/portaria/CargasFechadasAguardandoPanel.tsx`**:
   - No `update` de `veiculos_esperados`, adicionar `.ilike("placa", c.placa)` quando `c.placa` existir, mais `.eq("conferido", false)`. Isso garante que a marcação de "conferido" nunca cruze ciclos.

## Riscos

Nenhum risco operacional — são reforços defensivos. Não há mudança de schema, não há migração SQL nova, apenas filtros adicionais em queries que já existem.
