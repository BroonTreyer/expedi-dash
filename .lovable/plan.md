

# Persistir Veículos Esperados no Banco para Todos os Usuários

## Problema

Atualmente os dados da planilha importada ficam apenas no `useState` do navegador de quem fez o upload. Outros usuários/conferentes não veem a lista.

## Solução

Criar tabela `veiculos_esperados` no banco e migrar toda a lógica de state local para queries reativas.

### 1. Migração — Criar tabela `veiculos_esperados`

```sql
CREATE TABLE public.veiculos_esperados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  grupo text NOT NULL DEFAULT 'PRÓPRIA',
  placa text NOT NULL,
  destino text,
  carga_id text,
  peso numeric,
  qtd_entregas integer,
  motorista text,
  transportadora text,
  ajudantes text,
  tipo_veiculo text,
  conferido boolean NOT NULL DEFAULT false,
  conferido_por uuid,
  conferido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  criado_por uuid
);

ALTER TABLE public.veiculos_esperados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select veiculos_esperados" ON public.veiculos_esperados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert veiculos_esperados" ON public.veiculos_esperados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update veiculos_esperados" ON public.veiculos_esperados FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete veiculos_esperados" ON public.veiculos_esperados FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
```

### 2. Hook `useVeiculosEsperados.ts` — Criar

- `useVeiculosEsperados(data)` — query reativa por `data_referencia`
- `useImportarVeiculosEsperados()` — mutation que deleta registros existentes da data e insere os novos
- `useMarcarConferido()` — mutation que seta `conferido = true` por placa
- `useLimparVeiculosEsperados()` — mutation que deleta todos da data

### 3. `ImportarPlanilhaDialog.tsx` — Editar

- No `handleConfirm`, em vez de chamar `onImport(rows)`, chamar a mutation de importação que insere no banco
- Remover o callback `onImport` da interface

### 4. `Portaria.tsx` — Editar

- Remover states `veiculosEsperados` e `placasConferidas`
- Usar `useVeiculosEsperados(dateFromStr)` para buscar dados do banco
- Derivar `conferidos` do campo `conferido` da query
- No `handleMovimentacaoCreated`, chamar mutation `useMarcarConferido`
- No `onClear`, chamar mutation `useLimparVeiculosEsperados`

### 5. `VeiculosEsperadosPanel.tsx` — Ajuste mínimo

- Adaptar interface para receber dados do banco (mesmo shape, só muda a fonte)

## Arquivos

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `veiculos_esperados` com RLS |
| `src/hooks/useVeiculosEsperados.ts` | Criar — queries e mutations |
| `src/components/portaria/ImportarPlanilhaDialog.tsx` | Editar — inserir no banco ao confirmar |
| `src/pages/Portaria.tsx` | Editar — trocar state local por query do banco |
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Ajuste de interface |

