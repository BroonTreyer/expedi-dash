
## Auditoria — diagnóstico

Após ler `Index.tsx`, `Rupturas.tsx`, `PreCargas.tsx`, `useCarregamentos.ts` e `usePreCargas.ts`, identifiquei o que está acontecendo com os pedidos 505/504/7601/922 (e qualquer pré-carga em geral):

### Por que a pré-carga “some do painel” quando você troca a data
Hoje, o seletor **“Data do Carregamento”** chama `useAtualizarDataCarga`, que faz `UPDATE carregamentos_dia SET data = nova` em todos os registros do `carga_id`. Como o Painel principal (`/`) e a aba `Rupturas › Faltando agora` carregam dados via `useCarregamentos(hoje, hoje)` — que só traz `data = hoje OR (data < hoje E status ≠ 'Carregado' E ≤ 30 dias)` —, mudar a `data` para o **futuro** faz a linha cair fora da query e desaparecer dessas telas.

### Por que as rupturas somem quando a pré-carga é fechada
A aba `Rupturas › Faltando agora` (linhas 172–181) filtra:
```ts
if (c.etapa === "logistica") return false;
```
Assim que o `FechamentoLoteDialog` muda `etapa: pre_carga → logistica`, a ruptura aberta da carga **some da tela** mesmo continuando em aberto. Só voltaria a aparecer se alguém remarcasse a ruptura.

---

## Plano de correção

### 1. Tornar “Data do Carregamento” puramente informativa (sem efeito colateral)
A data do bloco rosa na página de pré-carga é controle interno do faturamento e **não pode mexer em nada do sistema**.

- **Migração:** adicionar coluna `data_prevista_carregamento date` em `carregamentos_dia` (nullable). Nada de trigger, nada de constraint — é só um campo de anotação.
- `src/hooks/usePreCargas.ts`:
  - `useAtualizarDataCarga` passa a fazer `UPDATE ... SET data_prevista_carregamento = nova` (não toca em `data`).
  - Invalida só `["pre-cargas"]` (não invalida mais `["carregamentos"]` nem `["consolidated"]`, porque nada depende disso).
- `src/pages/PreCargas.tsx` e tipos locais (`PreCargaGrupo`):
  - Exibir/editar `data_prevista_carregamento` no bloco rosa.
  - Fallback de exibição: se `data_prevista_carregamento` for `null`, mostra `data` (compatibilidade com pré-cargas antigas).
  - Mensagem de ajuda atualizada para “Controle interno do faturamento. Não afeta filtros nem painéis.”
- `src/integrations/supabase/types.ts` é regenerado automaticamente — não editar à mão.
- **Resultado:** mudar a data de pré-carga não muda mais a `data` da `carregamentos_dia`. A pré-carga continua aparecendo no Painel/Rupturas exatamente como antes da alteração. Só a etiqueta no bloco rosa muda.

### 2. Rupturas continuam visíveis após o fechamento da pré-carga
- `src/pages/Rupturas.tsx` (aba `FaltandoAgora`):
  - Remover o filtro `if (c.etapa === "logistica") return false;`.
  - Manter `if (c.carga_id != null && c.status === "Carregado") return false;` — esse é o critério correto: a ruptura sai da lista **só** quando o item é efetivamente carregado no portão.
- Sem mudanças em hooks/data.
- **Resultado:** ruptura permanece visível durante `pré-carga → fechada → no pátio`, e sai sozinha quando vira `Carregado`.

### 3. Visibilidade defensiva (curto: 2 linhas)
- `useCarregamentos` já traz carry-over de 30 dias — suficiente para qualquer pré-carga em janela operacional. Sem mudanças aqui.

### Arquivos tocados
- **Nova migração SQL:** add column `data_prevista_carregamento` em `carregamentos_dia`.
- `src/hooks/usePreCargas.ts` — mutation passa a gravar a nova coluna.
- `src/pages/PreCargas.tsx` — leitura/exibição/edição da nova coluna, texto de ajuda.
- `src/pages/Rupturas.tsx` — remover filtro `etapa === "logistica"` em `todasRupturas`.

### Validação
1. Abrir uma pré-carga e mudar a “Data do Carregamento” para D+5 → pré-carga **continua** no Painel e em `/rupturas`. Apenas o texto da data no bloco rosa muda.
2. Fechar a pré-carga (vira `logistica`) com 1 item em ruptura → a ruptura **continua** em `/rupturas › Faltando agora`.
3. Carregar o item no portão (status = `Carregado`) → a ruptura sai sozinha. ✓
4. Pré-cargas antigas (sem `data_prevista_carregamento`) seguem mostrando a `data` normal no bloco rosa.
