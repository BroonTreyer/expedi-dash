

## Bug: trigger `on_carga_fechada` cria veículo "Aguardando Veículo" duplicado mesmo com walk-in ativo

### Diagnóstico (caso real auditado)

Carga **ELIAS + EDIVAR**, placa **RZU1A65**, fechada hoje 19:34:59:

1. Existia um walk-in registrado em **22/04** (`data_referencia=2026-04-21`, `status=aguardando_vinculo`, `carga_id=NULL`) para essa placa.
2. Logística fechou a carga preenchendo a placa manualmente no `FechamentoLoteDialog` (sem clicar no card "Veículos no pátio"), então o `UPDATE` que linka o walk-in ao `carga_id` (linhas 154-174 do dialog) **não rodou** — `walkInVinculadoId` era `null` e o match por placa só acontece se o walk-in estiver visível no painel; nesse caso provavelmente o painel já não mostrava (filtro de hoje).
3. Trigger `on_carga_fechada` então rodou:
   - `_exists` (busca por `carga_id`): **false** (walk-in ainda com `carga_id=NULL`).
   - `_walkin_ativo` (busca por placa + `data_referencia = CURRENT_DATE`): **false**, porque o walk-in tinha `data_referencia=2026-04-21`, não hoje.
   - INSERT executado → apareceu novo "previsto" duplicado.

**Causas raiz:**
- A guarda `_walkin_ativo` no trigger exige `data_referencia = CURRENT_DATE`, mas walk-ins legítimos podem ficar pendentes vários dias.
- O `FechamentoLoteDialog` só vincula o walk-in se o usuário clicar no card "Veículos no pátio" — digitar a mesma placa manualmente não dispara o vínculo.

### Mudança 1 — Corrigir o trigger (migration SQL)

Atualizar `public.on_carga_fechada()` para que `_walkin_ativo` aceite walk-ins recentes (últimos N dias) e ignore o filtro por `data_referencia`:

```sql
SELECT EXISTS(
  SELECT 1 FROM public.veiculos_esperados
  WHERE upper(trim(placa)) = upper(trim(NEW.placa))
    AND walk_in = true
    AND status_autorizacao IN ('aguardando_vinculo','aguardando_autorizacao','autorizado')
    AND created_at > now() - interval '7 days'
) INTO _walkin_ativo;
```

Adicionar também: se houver walk-in ativo encontrado, **vincular** automaticamente esse walk-in à carga (UPDATE `carga_id`, `status_autorizacao='autorizado'`, `autorizado_em=now()`) em vez de simplesmente pular o INSERT. Assim o veículo deixa de aparecer em "Aguardando Vínculo" e a carga fica corretamente associada.

### Mudança 2 — Auto-vincular por placa no `FechamentoLoteDialog`

Em `src/components/dashboard/FechamentoLoteDialog.tsx` (`handleSubmit`, linhas 154-174):
- Hoje: só auto-vincula se `walkInVinculadoId` ou se a placa bater com algum item do painel `veiculosNoPatio` (que filtra "no pátio hoje").
- Trocar a busca por uma **query direta** em `veiculos_esperados` por `placa = placaNorm AND walk_in = true AND status_autorizacao IN ('aguardando_vinculo','aguardando_autorizacao','autorizado')` (sem filtro de data) e atualizar o registro encontrado. Isso fecha a porta para o cenário "preenchi placa manual e o walk-in ficou órfão".

### Mudança 3 — Limpeza dos dados deste caso

Após aplicar a migration:
- DELETE no registro `veiculos_esperados` id `7b6bd97b-d3be-471b-9d91-fd5b27105758` (o "previsto" duplicado da `RZU1A65` criado pelo trigger).
- UPDATE no walk-in `RZU1A65` (id `3707f65a-2ac9-4469-8749-768ebbc489ae`): setar `carga_id='ELIAS + EDIVAR'`, `status_autorizacao='autorizado'`, `autorizado_em=now()`.

### Como verificar

1. Abrir `/portaria` → painel "Aguardando Veículo": a placa `RZU1A65` (Hiago) **não** deve mais aparecer duplicada.
2. Painel "Veículos no pátio / aguardando vínculo": a `RZU1A65` deve estar ligada à carga "ELIAS + EDIVAR" e autorizada.
3. Repetir o fluxo com qualquer carga nova: registrar walk-in, fechar carga digitando a mesma placa manualmente — não deve mais criar o "previsto" duplicado.

### Fora do escopo

- Mudar o painel "Veículos no pátio" do `FechamentoLoteDialog` para mostrar walk-ins de dias anteriores (separado).
- Revisão do trigger `on_walkin_status_change`.
- Outras cargas antigas com possível duplicação — só apago a deste caso; se houver mais, vocês me avisam.

### Resultado esperado

- Trigger nunca mais cria "previsto" duplicado quando já existe walk-in ativo da mesma placa.
- Fechar carga com placa de walk-in (mesmo digitada manualmente) **autoriza** o walk-in e amarra `carga_id` corretamente.
- Caso `RZU1A65` / "ELIAS + EDIVAR" corrigido.

