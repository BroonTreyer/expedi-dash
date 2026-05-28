## Reverter pré-cargas para hoje

Atualmente há **135 linhas** com `etapa = 'pre_carga'` em `carregamentos_dia`, sendo **134** com `data` diferente de hoje (28/05/2026).

### Ação

Executar uma única atualização em massa:

```sql
UPDATE public.carregamentos_dia
SET data = CURRENT_DATE,
    data_prevista_carregamento = NULL
WHERE etapa = 'pre_carga'
  AND data <> CURRENT_DATE;
```

- Move todas as pré-cargas abertas para a data de hoje → voltam a aparecer no Painel (`/`) e em Rupturas › Faltando agora.
- Limpa `data_prevista_carregamento` para não restar resíduo do campo informativo antigo. (Quem quiser registrar nova previsão pode editar de novo em `/pre-cargas`.)

### Fora do escopo

- Pré-cargas que já viraram `logistica`/`portaria` não são tocadas (já têm fluxo próprio).
- Pedidos `Carregado` continuam intactos.
- Nenhuma mudança de código — só dados.

### Verificação após executar

```sql
SELECT data, COUNT(*) FROM carregamentos_dia
WHERE etapa='pre_carga' GROUP BY data ORDER BY data;
```
Esperado: tudo concentrado em `CURRENT_DATE`.
