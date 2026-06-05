# Auditoria — Painel de Rupturas

Rodei a auditoria contra o banco e o código (`src/pages/Rupturas.tsx` + `useCarregamentos` + triggers `set_ruptura_sinalizada` / `preserve_peso_original` / `cap_peso_pelo_original`). O painel **está atualizando**, mas há inconsistências de dados que fazem ele “não bater” com os pedidos.

## O que encontrei

### 1. `quantidade_original` corrompida em muitos pedidos antigos
Existem **dezenas de linhas** com `quantidade > quantidade_original` (ex.: pedido #15 com `quantidade_original = 2` e `quantidade = 35–125`; pedido #22 com `quantidade_original = 1` e `quantidade = 100–500`). Não é ruptura — é dado de baseline gravado errado em algum lote antigo. Hoje isso não “acende” ruptura porque o trigger compara **peso**, não quantidade, mas distorce qualquer KPI de “quantidade não carregada” quando houver ruptura nesses pedidos.

### 2. Linhas em ruptura total com peso/quantidade **não zerados** (pedido #240 hoje, MOISA)
```
nº 240  LINGUIÇA SUINA FINA  peso=3000  peso_original=3000  qtd=150  qtd_original=250  ruptura=true
```
- `pesoNaoCarregado` devolve `3000 kg` (peso_original inteiro, regra de ruptura total).
- Mas `peso` continua `3000` (não foi zerado pelo CarregamentoDialog), então qualquer relatório que some `peso` direto (ex.: peso da carga) **conta 3000 kg que não vão sair**.
- `qtdCortada` no “Faltando agora” usa `quantidade_original = 250` → 250 unid faltando, enquanto a tela do pedido mostra `quantidade = 150`. Os dois números coexistem e parecem se contradizer.

### 3. Duplicatas por `operation_id + numero_pedido`
2 grupos hoje com 2 linhas para o mesmo `(operation_id, numero_pedido)`:
- `8f595d64…` pedido #236
- `82b4668f…` pedido #233

Isso conta o mesmo item 2× no “Pedidos” do KPI e infla o resumo por produto.

### 4. Carry-over de 30 dias no “Faltando agora”
Linhas antigas (ex.: 13/05 NG DISTRIBUIDORA — `peso=1000 peso_original=5000 ruptura=true`) aparecem em **“Faltando agora”** porque `useCarregamentos(today,today)` traz `data < today AND status != 'Carregado'` como carry-over. Pode ser legítimo (item nunca foi reposto/cancelado), mas hoje **não tem regra de expurgo**: se a equipe não “Carregar” ou excluir, fica eternamente listado.

### 5. Triggers OK
`set_ruptura_sinalizada`, `preserve_peso_original` e `cap_peso_pelo_original` estão coerentes com o frontend (incluindo override explícito do `CarregamentoDialog`). Não vejo bug de cálculo nelas — o problema é dado histórico + zeragem opcional do peso em ruptura total.

---

## Plano de correção (mínimo invasivo, em camadas)

### A) Frontend — fonte única de verdade nos KPIs (sem mudar negócio)
1. `src/pages/Rupturas.tsx` (aba **Faltando agora** e **Histórico**):
   - Trocar a soma de `qtdCortada` para usar **`quantidadeNaoCarregada(c)`** de `src/lib/peso-utils.ts`, que já existe e segue a mesma regra de `pesoNaoCarregado`. Hoje a aba “Histórico” faz inline `Math.max(0, qOrig - qAtual)` e a aba “Faltando agora” usa cálculo próprio — vamos unificar.
   - Quando `quantidade > quantidade_original` (dado corrompido), tratar como **0 perdido** (já é o que `Math.max(0, …)` faz, mas hoje no “Faltando agora” se `ruptura=true` o código devolve `quantidade_original` cru — vamos passar a usar o helper e blindar).
   - Contar **pedidos únicos** por `operation_id ?? numero_pedido` (hoje é só `numero_pedido`), eliminando o efeito de duplicata no KPI.

2. KPI cards: incluir um pequeno aviso (`?` tooltip) explicando que “Faltando agora” inclui pedidos arrastados de até 30 dias atrás que ainda não foram marcados como Carregado.

### B) Frontend — zerar peso/quantidade ao marcar ruptura total
3. `src/components/dashboard/CarregamentoDialog.tsx` (handleSubmit / helper que monta payload de ruptura):
   - Quando o usuário marca `ruptura = true`, enviar `peso = 0` e `quantidade = 0` no UPDATE, mantendo `peso_original` / `quantidade_original` como referência.
   - Isso elimina a contradição visual (3000 kg em ruptura total mostrando peso 3000 no romaneio) e alinha com `pesoEfetivo`.

### C) Saneamento do banco — uma migration pontual (com aprovação)
4. Migration `fix_quantidade_original_inconsistente`:
   ```sql
   UPDATE public.carregamentos_dia
   SET quantidade_original = quantidade
   WHERE quantidade_original IS NOT NULL
     AND quantidade IS NOT NULL
     AND quantidade > quantidade_original
     AND ruptura = false;
   ```
   Só toca em linhas **sem ruptura** — assume que o valor real entregue (`quantidade`) é o baseline correto quando o original ficou menor por bug de import.

5. Migration `dedupe_carregamentos_operation_pedido` (opcional, com revisão manual antes):
   - Listar pares duplicados e remover a linha mais recente apenas se forem 100% idênticas em produto/cliente/peso. Não rodo isso automático — gero um SELECT para o usuário aprovar caso a caso.

### D) Política de expurgo do carry-over (decisão de produto)
6. Adicionar botão **“Limpar/Resolver ruptura antiga”** nas linhas do “Faltando agora” com `data < hoje - 7d` — marca como resolvida (define `ruptura=false`, mantém `ruptura_sinalizada` para histórico) ou cancela. Evita o painel ficar eternamente com itens órfãos.

---

## Escopo proposto agora
Implementaria **A + B** (sem mexer em banco) em uma rodada — corrige o que o usuário está vendo de “errado” no painel. **C e D** entram em uma segunda rodada, com aprovação explícita das migrations e do fluxo de expurgo.

Confirma seguir com A + B agora?
