## Causa raiz

Os 4 adiantamentos do "guava transportes Itda" foram criados com `transportadora_id = NULL` no banco. O diálogo de Comprovante busca o PIX por `transportadora_id`, então mesmo com o cadastro preenchido (GUAVA LOGISTICA E TRANSPORTES LTDA, código 34312, PIX 63283459000160) nada aparece.

Por que `transportadora_id` ficou nulo? O nome veio do DACTE em caixa baixa e abreviado ("guava transportes Itda"), e o cadastro está em caixa alta e por extenso ("GUAVA LOGISTICA E TRANSPORTES LTDA"). O `transpInfoByName` em `AdiantamentosTab.tsx` faz `Map.get(nome)` com match exato — não encontra, salva id nulo.

```text
DACTE:    "guava transportes Itda"
Cadastro: "GUAVA LOGISTICA E TRANSPORTES LTDA"   → Map.get() falha → id NULL → PIX some
```

## Correções

### 1. Normalização + fallback por nome
Criar utilitário `normalizaNomeTransp(s)`:
- `toUpperCase`, trim, colapsar espaços
- remover sufixos societários (LTDA / LTD / ITDA / S/A / SA / EIRELI / ME / EPP)
- remover pontuação

Aplicar em `transpInfoByName` (chave normalizada) em `AdiantamentosTab.tsx` para que novos adiantamentos já saiam com `transportadora_id` correto.

Em `ComprovanteAdiantamentoDialog.tsx`, no `renderPix` e no aviso `semPix`: se `find(x => x.id === t.transportadora_id)` falhar, tentar `find(x => normaliza(x.nome) === normaliza(t.nomeFallback))`.

### 2. Vincular transportadora manualmente
No diálogo Comprovante, quando uma linha não tiver PIX, mostrar um Select pequeno "Vincular transportadora" listando os cadastros. Ao selecionar, faz `UPDATE adiantamentos_frete SET transportadora_id = ? WHERE id IN (ids da mesma transportadora)` e re-renderiza com PIX. Isso resolve os 4 adiantamentos da Guava agora e qualquer outro futuro caso a normalização não case.

### 3. Backfill dos adiantamentos atuais
Um botão "Revincular transportadoras" no topo de `AdiantamentosTab.tsx` (apenas admin) que percorre adiantamentos com `transportadora_id IS NULL`, aplica a normalização contra `transportadoras_financeiro` e atualiza os que casarem. Mostra toast com quantos vinculou.

## Detalhes técnicos

- Novo arquivo: `src/lib/transportadora-match.ts` exportando `normalizaNomeTransp` e `acharTranspPorNome(lista, nome)`.
- `AdiantamentosTab.tsx`: trocar `m.set(t.nome, t)` por `m.set(normaliza(t.nome), t)` e ler com `transpInfoByName.get(normaliza(r.nome))`.
- `ComprovanteAdiantamentoDialog.tsx`:
  - substituir os 2 `transp.find` por helper que tenta id e depois nome normalizado;
  - adicionar Select de vínculo manual abaixo do bloco quando `semPix` for true; usa mutation nova em `useAdiantamentos.ts` chamada `useVincularTransportadora({ids, transportadora_id})`.
- Sem alteração de schema; apenas UPDATE em coluna existente.

## Fora do escopo
- Não vou mexer no parser de DACTE (`parse-dacte-pdf`). A normalização + vínculo manual já cobrem os casos onde o nome do CT-e diverge do cadastro.