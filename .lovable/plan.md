## Problema

Na tela `/portaria/carga-propria`, o card rosa **"Aguardando vínculo da Logística"** está mostrando o **Célio (RSB1H70 / JR TRANSPORTES)**, que é claramente terceirizado.

## Causa raiz

Esse card vem de `SolicitacoesPendentesPanel.tsx` (linhas 57‑62), que lê `veiculos_esperados` e filtra apenas pela string do campo `grupo`:

```ts
const grupo = (v.grupo || "").toUpperCase();
const isPropria = grupo.includes("PROPRIA") || grupo.includes("PRÓPRIA");
```

No banco, o registro do Célio é:
- `placa: RSB1H70`
- `transportadora: JR TRANSPORTES`  ← claramente terceirizado
- `grupo: WALK-IN-PROPRIA`            ← rotulado erroneamente na hora do registro

O `grupo` foi gravado em `RegistroEntradaDialog.tsx:210` como `WALK-IN-PROPRIA` porque na hora do walk-in marcaram "PRÓPRIA" — mas a transportadora preenchida prova que é terceirizado. Essa inconsistência é a fonte da mistura, e o filtro precisa ser tolerante a isso.

Na verdade, a regra de negócio em todo o resto do app já é: **com transportadora = terceirizado; sem transportadora = própria**. O painel rosa é o único lugar que olha só o `grupo`.

## Correção

### 1. `src/components/portaria/SolicitacoesPendentesPanel.tsx`

Trocar o filtro para usar a mesma regra do resto do sistema — **a transportadora manda**; o grupo só é usado como fallback quando não há transportadora:

```ts
const ativos = ativosRaw.filter((v: any) => {
  if (!categoria) return true;
  const temTransp = !!(v.transportadora && String(v.transportadora).trim());
  if (temTransp) {
    // Com transportadora: sempre terceirizado
    return categoria === "terceirizado";
  }
  // Sem transportadora: usa o grupo como dica; default = própria
  const grupo = (v.grupo || "").toUpperCase();
  const isTerc = grupo.includes("TERCEIR");
  const isPropria = !isTerc;
  return categoria === "carga_propria" ? isPropria : !isPropria;
});
```

### 2. Saneamento do registro existente do Célio

Atualizar a única linha inconsistente para refletir a realidade (terceirizado), via migration:

```sql
UPDATE public.veiculos_esperados
SET grupo = 'WALK-IN-TERCEIRIZADO'
WHERE id = 'a27963ce-ce7c-43b5-b7e5-198c7925c4b0'
  AND status_autorizacao = 'aguardando_vinculo'
  AND transportadora IS NOT NULL
  AND grupo = 'WALK-IN-PROPRIA';
```

(Sem efeito se o registro já tiver sido alterado/finalizado; idempotente.)

### 3. Reforço preventivo (opcional, mesma migration)

Trigger `BEFORE INSERT/UPDATE` em `veiculos_esperados` que normaliza `grupo` quando há transportadora preenchida — garante que casos novos não voltem a aparecer no lado errado mesmo se o operador escolher mal:

```sql
CREATE OR REPLACE FUNCTION public.normalize_veiculo_esperado_grupo()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transportadora IS NOT NULL
     AND btrim(NEW.transportadora) <> ''
     AND NEW.grupo = 'WALK-IN-PROPRIA' THEN
    NEW.grupo := 'WALK-IN-TERCEIRIZADO';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_veic_esperado_grupo ON public.veiculos_esperados;
CREATE TRIGGER trg_normalize_veic_esperado_grupo
BEFORE INSERT OR UPDATE OF transportadora, grupo ON public.veiculos_esperados
FOR EACH ROW EXECUTE FUNCTION public.normalize_veiculo_esperado_grupo();
```

## Resultado esperado

- Célio (RSB1H70 / JR TRANSPORTES) some de `/portaria/carga-propria` e aparece em `/portaria/terceirizado`.
- Carga Própria fica limpa de terceirizados, mesmo se o `grupo` foi gravado errado no walk-in.
- Sem alteração nos demais painéis ou no fluxo de cargas fechadas (o painel azul já foi corrigido na rodada anterior).

## Arquivos

- `src/components/portaria/SolicitacoesPendentesPanel.tsx` — ajuste do filtro.
- Nova migration SQL — UPDATE pontual + trigger de normalização.
