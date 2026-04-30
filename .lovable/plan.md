# Correções de bugs reais

## Resultado da varredura completa

- **TypeScript**: ✅ 0 erros
- **Runtime no navegador**: ✅ 0 erros
- **Console do preview**: ✅ limpo
- **Dev-server**: ✅ rodando normalmente
- **ESLint**: 443 erros → após análise, apenas **6 são bugs reais**. O restante (~430) são `no-explicit-any`, escapes cosméticos e padrões aceitos do shadcn — **ruído sem impacto no usuário**.

## Por que NÃO vou corrigir os 430 `any`
Mexer em dezenas de arquivos só para satisfazer o linter tem **alto risco de regressão** e **zero benefício visível**. Se quiser uma faxina de tipos depois, fazemos em rodada dedicada e isolada.

---

## Bugs que serão corrigidos

### 1. `CargasFechadasAguardandoPanel.tsx` — risco de dessincronização realtime ⚠️ (mais crítico)
Dois `useEffect` usam expressões complexas no array de deps (`cargas.map(...).join("|")` e `cargas.some(...)`). React não consegue rastrear corretamente, podendo causar **re-execuções extras** ou, pior, **deps "esquecidas"** quando dados mudam.

**Correção**: extrair para `useMemo` antes do `useEffect`.

### 2. `CarregamentoDialog.tsx` — auto-preenchimento de cliente potencialmente errado
`useEffect` que preenche cliente a partir de `lookedUpCliente` ignora `codigoClienteInput` nas deps. Se o usuário digitar código novo muito rápido, pode preencher dados antigos.

**Correção**: incluir `codigoClienteInput` nas deps.

### 3. `CarregamentoTable.tsx` — anti-padrão em 3 toggles de Set
Linhas 161, 402, 451 usam `next.has(key) ? next.delete(key) : next.add(key)` como statement (expressão ternária descartada). Funciona mas é frágil.

**Correção**: trocar por `if/else` claro.

### 4. `Rupturas.tsx` — re-cálculo desnecessário no useMemo
`const today = new Date()` é recriado a cada render e usado como dep do `useMemo`, invalidando o cache em todo render.

**Correção**: estabilizar `today` em `useMemo` próprio (já tem essa sugestão do linter).

### 5. `RegistroMovimentoDialog.tsx` — dep faltante em useMemo
`REGULARIZAR_SKIP` ausente nas deps. É uma constante de módulo, então o impacto é nulo na prática, mas vamos limpar.

**Correção**: adicionar nas deps.

### 6. `ImportarPlanilhaDialog.tsx` — escapes redundantes em regex
`\/` e `\-` em classe de caractere não precisam de escape. Funciona, mas é o que mais polui o output do lint.

**Correção**: remover escapes desnecessários.

## Detalhes técnicos

```text
Arquivos editados (6):
  src/components/portaria/CargasFechadasAguardandoPanel.tsx
  src/components/dashboard/CarregamentoDialog.tsx
  src/components/dashboard/CarregamentoTable.tsx
  src/pages/Rupturas.tsx
  src/components/portaria/RegistroMovimentoDialog.tsx
  src/components/portaria/ImportarPlanilhaDialog.tsx
```

Nenhuma migração de banco. Nenhuma mudança em edge function. Nenhuma alteração visual. Apenas hardening de hooks e limpeza de padrões frágeis.

## O que NÃO será feito (e por quê)
- ❌ Substituir `any` em massa — risco de regressão > benefício
- ❌ Mexer em arquivos shadcn (`button.tsx`, `badge.tsx`, etc.) — padrão oficial do shadcn
- ❌ Tocar no `tailwind.config.ts` `require()` — necessário para plugin
- ❌ Edge function `enrich-clientes-viacep` empty catches — são fallbacks intencionais
