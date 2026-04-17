
## Diagnóstico

A saída de terceirizado não mostra os campos de **Foto do Lacre** e **Número do Lacre** porque:

- Em `portaria-fields-config.ts` L192-197, a função `getMatrix("saida")` retorna a matriz `VISIBILITY` (de entrada) e não `VISIBILITY_SAIDA`. Resultado: ao registrar a saída de terceirizado, o dialog renderiza os campos de **entrada** (Empresa, Foto Placa, Placa, Motorista, Tipo de Caminhão) — exatamente o que aparece no print do usuário.
- A matriz `VISIBILITY_SAIDA` já está correta: `foto_lacre_url` e `numero_lacre` são **obrigatórios** para terceirizado (L172, L181). Está pronta, só não está sendo usada.
- O OCR do lacre também já foi implementado (`handleFotoCapture` L185-197) — só falta os campos aparecerem.

## Plano

### 1. Corrigir `getMatrix` em `portaria-fields-config.ts`
Adicionar a regra: quando `tipoMovimento === "saida"`, retornar `VISIBILITY_SAIDA`. Isso ativa imediatamente os campos de Lacre na saída de terceirizado/fornecedor/carga_propria sem precisar mexer em mais nada.

```ts
if (tipoMovimento === "saida") return VISIBILITY_SAIDA;
```

### 2. Verificar reflexo no fluxo
- **Saída de terceirizado** (botão "Registrar Saída" no Pátio) → dialog passa `prefill` + `tipo="saida"` → agora vai pedir foto do lacre + nº lacre + foto da placa + observações + conferente. ✅
- **Saída de fornecedor** → idem, mas com `foto_lacre_url`/`numero_lacre` obrigatórios. Se não fizer sentido para fornecedor (carga simples), podemos deixar opcional — confirmar com user.
- **Carga própria etapa lacre** continua usando `tipo="lacre"` → `VISIBILITY_SAIDA` (mesma matriz). ✅ sem regressão.
- **Saída p/ rota carga própria** usa `tipo="saida_rota"` → mantém `VISIBILITY` por design (precisa dos campos de saída inicial). ✅

### 3. Sem outras mudanças
- UI do dialog, OCR do lacre, persistência (`numero_lacre`, `foto_lacre_url` já são salvos em L309 e L313 do `RegistroMovimentoDialog.tsx`).
- Schema, RLS, hooks.

## Arquivos
- ✏️ `src/lib/portaria-fields-config.ts` — uma linha em `getMatrix` (L192-197)

## Pergunta
Foto do lacre + nº lacre devem ser **obrigatórios** também na saída de **fornecedor**, ou apenas terceirizado? Hoje a matriz marca como obrigatório para os dois — confirma ou prefere relaxar para fornecedor?
