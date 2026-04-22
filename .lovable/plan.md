

## Painel KM: capturar foto na Saída p/ Rota E no Retorno

### Diagnóstico

Hoje, na Carga Própria, o campo `foto_painel_url` é único por registro — então a foto do painel KM tirada na **Saída p/ Rota** (KM inicial) é sobrescrita pela foto tirada no **Retorno** (KM final). Resultado: só sobra a última, e o detalhe do movimento mostra apenas uma foto de painel.

### Solução

Adicionar uma segunda coluna dedicada à foto do painel inicial, mantendo a existente para o retorno. Assim ambas as fotos coexistem no mesmo registro de Carga Própria.

#### 1. Banco (migration)

- Nova coluna `foto_painel_saida_url text` em `movimentacoes_portaria` (nullable, sem default).
- Semântica:
  - `foto_painel_saida_url` → foto do painel KM no momento da **Saída p/ Rota** (KM inicial).
  - `foto_painel_url` → foto do painel KM no momento do **Retorno** (KM final). *(comportamento atual preservado.)*

#### 2. Captura na Portaria — Carga Própria

- **Saída p/ Rota** (`PortariaCargaPropria.tsx`, etapa "em_rota"): adicionar componente `CapturaFoto` para "Painel KM (Saída)" ao lado do campo `km_inicial`. Upload via `uploadFotoMovimentacao(file, "painel")` → grava em `foto_painel_saida_url`.
- **Retorno** (etapa "retornou"): mantém o `CapturaFoto` atual de "Painel KM" → continua gravando em `foto_painel_url`.

#### 3. Exibição no `MovimentoDetailsDialog`

Atualizar o builder de fotos (Carga Própria) para listar as duas separadamente:

| Campo | Label |
|---|---|
| `foto_painel_saida_url` | 🛞 Painel KM (Saída p/ Rota • HH:mm) |
| `foto_painel_url` | 🛞 Painel KM (Retorno • HH:mm) |

Adicionar `foto_painel_saida_url` no `select` da query `relatedRecords` e no `pushPhoto`. Deduplicação por URL continua igual.

#### 4. Tipos

Adicionar `foto_painel_saida_url: string | null` na interface `MovimentacaoPortaria` em `useMovimentacoesPortaria.ts`. (`types.ts` é regenerado automaticamente após a migration.)

### O que NÃO muda

- Categorias Terceirizado/Fornecedor/Visitante: sem alteração (continuam usando `foto_painel_url` quando aplicável).
- Histórico/Tabela/Pátio Atual: sem alteração visual — só o diálogo de detalhes ganha a 2ª foto.
- Triggers, RLS, KPIs, lacre, nota fiscal, placa, documento: intactos.
- Registros antigos com apenas `foto_painel_url` continuam funcionando — só não terão a foto de saída (campo fica null).

### Detalhes técnicos

```sql
ALTER TABLE public.movimentacoes_portaria
  ADD COLUMN foto_painel_saida_url text;
```

```ts
// PortariaCargaPropria.tsx — etapa "em_rota"
<CapturaFoto
  label="Painel KM (Saída)"
  onCapture={async (file) => {
    const url = await uploadFotoMovimentacao(file, "painel");
    setFotoPainelSaidaUrl(url);
  }}
/>
// no update da etapa em_rota:
foto_painel_saida_url: fotoPainelSaidaUrl
```

```ts
// MovimentoDetailsDialog.tsx — builder Carga Própria
pushPhoto(r.foto_painel_saida_url, "Painel KM", buildLabel("🛞","Painel KM","foto_painel_saida_url"));
pushPhoto(r.foto_painel_url, "Painel KM", buildLabel("🛞","Painel KM","foto_painel_url"));

const labelEtapaPorTipoFoto = (field: string) => ({
  foto_painel_saida_url: "Saída p/ Rota",
  foto_painel_url: "Retorno",
  // ... demais
}[field] ?? "");
```

**Arquivos alterados:**
- Migration nova em `supabase/migrations/`
- `src/hooks/useMovimentacoesPortaria.ts` (interface)
- `src/pages/PortariaCargaPropria.tsx` (captura na Saída p/ Rota)
- `src/components/portaria/MovimentoDetailsDialog.tsx` (exibição)

