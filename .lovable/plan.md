

## Auditoria: Foto do Painel KM (Saída) não aparece nos Detalhes

### O que está realmente acontecendo

Auditei toda a cadeia (banco → captura → exibição) e constatei:

- **Banco:** A coluna `foto_painel_saida_url` existe e está bem definida.
- **Exibição:** O `MovimentoDetailsDialog` já busca e renderiza as duas fotos corretamente (linhas 212–213 + 232–233).
- **Causa raiz:** **NENHUM registro de Carga Própria no banco tem `foto_painel_saida_url` preenchido** — todos estão `NULL`, mesmo após a migration. Os 8+ registros mais recentes (NVP6191, FFW4J99, PRO0D73, NKU2C52, etc.) gravam só o `foto_painel_url` (retorno). Portanto não tem como o diálogo mostrar uma foto que nunca foi salva.

### Por que a captura não está salvando

Identifiquei três bugs encadeados no fluxo de captura da Saída p/ Rota:

#### Bug 1 — A foto do painel NÃO aparece no formulário de Saída p/ Rota
O campo `foto_painel_saida_url` está marcado como `obrigatorio` para Carga Própria **só na visibility de ENTRADA** (`VISIBILITY`). Mas o fluxo da Saída p/ Rota usa o `tipo = "saida_rota"`, que provavelmente cai noutro filtro de visibility. Resultado: o `CapturaFoto` desse campo nem é renderizado, então o operador da portaria não tira a foto.

#### Bug 2 — `handleFotoCapture` não mapeia a chave do novo campo
No `tipoFotoMap` do `RegistroMovimentoDialog` (linha 188), faltam as entradas para `foto_painel_saida_url`. Quando o campo é renderizado, o upload cai no fallback `"doc"`, jogando a foto pra pasta errada do storage (`movimentacoes/doc/…` em vez de `…/painel/…`). A foto sobe, mas em pasta inconsistente.

#### Bug 3 — Falta cobrir `prefillEtapa = "saida_rota"` na visibility certa
O `getVisibleBlocks(categoria, "saida_rota")` precisa retornar `foto_painel_saida_url` como obrigatório. Hoje, a visibility de saída_rota não inclui esse campo.

### Correção (3 ajustes pontuais)

#### 1. `src/lib/portaria-fields-config.ts`
Garantir que `foto_painel_saida_url` apareça como **obrigatório** para Carga Própria no fluxo de Saída p/ Rota. Verificar se existe um `VISIBILITY_SAIDA_ROTA` (ou estender `VISIBILITY` para cobrir esse `tipo`) e adicionar:
```ts
foto_painel_saida_url: { ...allOculto, carga_propria: "obrigatorio" }
km_inicial:            { ...allOculto, carga_propria: "obrigatorio" }
foto_placa_url:        { ...allOculto, carga_propria: "obrigatorio" }
placa, motorista, rota: obrigatórios
```

#### 2. `src/components/portaria/RegistroMovimentoDialog.tsx` (linha 188)
Adicionar mapeamento no `tipoFotoMap`:
```ts
const tipoFotoMap: Record<string, string> = {
  foto_placa_url: "placa",
  foto_painel_url: "painel",
  foto_painel_saida_url: "painel",  // ← NOVO
  foto_nota_url: "nota",
  foto_documento_url: "doc",
  foto_lacre_url: "lacre",
};
```

#### 3. (Opcional) Regularização — incluir o novo campo na lista de skip
Em `REGULARIZAR_SKIP` (linha 160), incluir `foto_painel_saida_url` para que admins possam regularizar saídas antigas sem foto:
```ts
const REGULARIZAR_SKIP = ["foto_painel_url", "foto_lacre_url", "foto_placa_url", "foto_painel_saida_url"];
```

### O que NÃO precisa mudar

- `MovimentoDetailsDialog` já está correto — vai mostrar as duas fotos automaticamente assim que houver dados salvos.
- `useMovimentacoesPortaria.ts` já tem o campo no tipo.
- A migration já criou a coluna no banco.
- O `handleSave` no branch `saida_rota` já grava `updates.foto_painel_saida_url` corretamente — só precisa receber o valor do form.

### Verificação pós-fix

Após aplicar, fazer 1 ciclo completo na Portaria (Carga Própria):
1. Registrar Chegada → 2. Saída p/ Rota (deve exibir o `CapturaFoto` "Painel KM (Saída)") → tirar foto → 3. Retorno → tirar foto do painel → 4. Lacre.

No diálogo de Detalhes do Movimento, o bloco "Fotos" deve listar:
- 📷 Foto da Placa (Saída p/ Rota)
- 🛞 Painel KM (Saída p/ Rota)  ← agora aparece
- 🛞 Painel KM (Retorno)
- 🔒 Foto do Lacre (Saída Final)

### Registros antigos

Os ~8 registros já finalizados com `foto_painel_saida_url = NULL` continuarão sem essa foto (não dá pra reconstituir). Apenas registros novos (criados após o fix) terão as duas fotos.

**Arquivos alterados:**
- `src/lib/portaria-fields-config.ts` (visibility do `saida_rota`)
- `src/components/portaria/RegistroMovimentoDialog.tsx` (`tipoFotoMap` + `REGULARIZAR_SKIP`)

