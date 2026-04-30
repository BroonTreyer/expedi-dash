# Diagnóstico — o que aconteceu

Olhei os dados do banco e identifiquei a causa dos 3 sintomas que você relatou.

## O que está acontecendo

### 1. Fagno aparece como "Expedido" sem ter entrado
No banco existem 2 registros pra placa do Fagno (carga "JR"):
- Uma `entrada` antiga de 27/04 marcada como `etapa_terceirizado='finalizado'`
- Uma `saida` "fantasma" criada hoje **sem horário de chegada, sem entrada, sem etapa** — movimento solto

A regra do `useStatusPortariaPorCarga.ts` diz: `if (tipo_movimento === "saida") → expedido`. Como existe uma linha "saida" para essa carga, o status fica "Expedido" mesmo sem o veículo ter entrado hoje.

### 2. Sinomar "sumiu"
Mesmo padrão: `entrada` finalizada hoje (12:40) + uma `saida` órfã 1 minuto depois **sem `carga_id`**. O painel "No Pátio" filtra `etapa !== 'finalizado'`, então some. E a saída sem `carga_id` não aparece em painel nenhum.

### 3. Jesumar não mostrando no pátio
Jesumar (CEARA CIF) **tem** os dados corretos no banco: `entrada`, `etapa='no_patio'`, `horario_entrada` preenchido. Deveria aparecer. O sintoma é cache desatualizado OU o status no Consolidado sendo poluído por outras movimentações com a mesma carga_id.

### 4. Bônus: cargas próprias nunca refletem status real
Erik, Reyller, Jaderson e os outros motoristas de hoje têm `categoria='carga_propria'`. Mas o `useStatusPortariaPorCarga` filtra **apenas `categoria=terceirizado`** (linha 81). Resultado: no Consolidado, toda carga própria fica "Aguardando" eternamente.

## Causa raiz comum
Existem **registros de "saida" desvinculados** sendo criados no banco (provavelmente exclusão parcial de entrada, fluxo de saída registrado isoladamente, ou clique duplo). E a regra confia cegamente neles, sem checar se há uma entrada correspondente.

---

# Plano de correção

## 1. Endurecer `src/hooks/useStatusPortariaPorCarga.ts`
- **Não marcar "Expedido" só por existir um `tipo_movimento=saida`**. Só considerar expedido se:
  - tem `horario_saida_final` preenchido, OU
  - tem `etapa_terceirizado='finalizado'`, OU
  - existe uma `entrada` correspondente (mesma `carga_id`) anterior à saída
- **Suportar `categoria=carga_propria`**: incluir no filtro do query e do realtime, mapeando `etapa_carga_propria`:
  - `aguardando_liberacao` → `chegou`
  - `chegou` → `patio`
  - `em_rota` → `expedido`
  - `retornou` → `expedido`
- **Ignorar saídas órfãs**: linha `tipo=saida` sem `horario_chegada/entrada` E sem `entrada` correspondente é descartada do cálculo.

## 2. Limpar os 2 registros órfãos atuais
Via migration de DELETE (com sua aprovação no momento da execução):
- Movimento `saida` do Fagno na carga "JR" (id `292abd8e...`) — sem entrada hoje
- Movimento `saida` do Sinomar (id `8768b164...`) sem `carga_id` — duplicata órfã

## 3. Prevenir novos órfãos no fluxo de saída
No `MovimentoDetailsDialog` e painéis que registram saída de terceirizado:
- Validar que existe uma entrada ativa (não-finalizada) correspondente antes de inserir o movimento de saída
- Se a entrada já foi finalizada, bloquear nova "saída" pra mesma placa/carga e mostrar aviso

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useStatusPortariaPorCarga.ts` | Lógica de derivação robusta + suporte carga_propria |
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Validar entrada ativa antes de criar saída |
| Migration DELETE | Remover 2 movimentos órfãos (Fagno + Sinomar) |

## Riscos e validação

- A mudança em `deriveEtapa` afeta o badge no **Consolidado** e os KPIs de peso na **Expedição** — ambos vão ficar **mais corretos**.
- Cargas próprias passarão a refletir status real (hoje ficam "Aguardando" — vai parecer mudança grande, mas é o correto).
- Os 2 registros órfãos do Fagno e Sinomar serão excluídos definitivamente — confirme antes que não foram saídas reais.

Posso aplicar?