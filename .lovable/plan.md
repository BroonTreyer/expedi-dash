

## Bug: Registro de Carga Própria pedindo Lacre na entrada

### Causa
Em `src/components/portaria/RegistroMovimentoDialog.tsx`, ao iniciar um novo registro de Carga Própria (tanto via `forcedCategoria` quanto via seletor de categoria), o `tipo` do movimento é definido como `"saida"`. Isso faz o formulário usar a matriz `VISIBILITY_SAIDA` (`portaria-fields-config.ts`), onde `foto_lacre_url` e `numero_lacre` são **obrigatórios** para `carga_propria`.

A 1ª etapa de Carga Própria (Saída p/ Rota) deveria mostrar apenas: foto da placa, placa, motorista, foto do painel, KM inicial, rota — sem lacre.

### Correção

**Arquivo:** `src/components/portaria/RegistroMovimentoDialog.tsx`

Trocar `setTipo("saida")` por `setTipo("saida_rota")` nos dois pontos onde um novo registro de Carga Própria é iniciado:

1. **Linha 129** (path `forcedCategoria`):
   ```ts
   setTipo(forcedCategoria === "carga_propria" ? "saida_rota" : "entrada");
   ```

2. **Linha 157** (path do seletor de categoria — função `handleSelectCategoria`):
   ```ts
   if (cat === "carga_propria" && tipo === "entrada") {
     setTipo("saida_rota");
   }
   ```

A função `getMatrix()` já mapeia `"saida_rota"` → `VISIBILITY` (mesma matriz da entrada normal), em que `foto_lacre_url`/`numero_lacre` são `oculto` para `carga_propria` e `rota`/`km_inicial`/`foto_painel_url` são obrigatórios.

### Salvamento
A lógica de `handleSave` (linhas 263-268) já trata `isCargaPropriaPrimeiraSaida = categoria === "carga_propria" && !prefillEtapa` e força `dbTipoMovimento = "saida"` no banco com `etapa_carga_propria: "em_rota"`. Como a checagem é por `categoria` (não por `tipo`), continua funcionando após a troca.

### Arquivos
- ✏️ `src/components/portaria/RegistroMovimentoDialog.tsx` — usar `tipo = "saida_rota"` para nova entrada de Carga Própria nos dois fluxos (forcedCategoria e seletor)

