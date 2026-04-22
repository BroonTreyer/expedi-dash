

## Bug do Welliton: aparece em "Esperados" e no "Pátio" ao mesmo tempo

### Diagnóstico

Welliton (placa **RMB0C89**, carga **GRUPO ELIZEU MARTINS**) tem **2 linhas** na tabela `veiculos_esperados` — por isso aparece em dois lugares:

1. **Walk-in original** (criado 14:44) — já conferido, vinculado à carga, entrada registrada às 14:51. Esse some da lista de esperados (status=autorizado + conferido) e está corretamente no pátio.
2. **Duplicata "previsto"** (criada 14:45:49 pelo trigger `on_carga_fechada`) — essa é a que polui a aba "Esperados".

**Causa raiz:** quando a Logística fechou a carga (atribuiu placa RMB0C89 aos itens), o trigger `on_carga_fechada` rodou para criar previsão automática. Ele tem um guard `EXISTS(SELECT 1 FROM veiculos_esperados WHERE carga_id = X)`, mas:

- O trigger dispara **por linha** da `carregamentos_dia`. A carga tem 9+ itens → 9+ disparos quase simultâneos.
- O `EXISTS` é avaliado **antes** do INSERT da previsão, então duas execuções concorrentes podem ambas ver "não existe previsão" e ambas inserirem (race condition clássica). Foi por isso que apareceu uma duplicata extra além do walk-in.
- Além disso, o guard só checa por `carga_id` — se o walk-in foi criado **sem** `carga_id` no momento do INSERT do trigger e só ganhou `carga_id` depois, o EXISTS retorna falso e duplica de qualquer forma.

Também: hoje o trigger ignora se já existe walk-in **conferido/autorizado** com a mesma `placa+data`. Deveria pular previsão se já há qualquer registro ativo daquele veículo no dia.

### Solução em 2 partes

#### 1. Limpeza imediata do registro duplicado do Welliton

- 🗑️ Apagar a linha `92b92661-1199-4243-b167-741a833f5e5b` (a "previsto" duplicada). Mantém o walk-in `fb760b74...` que tem o histórico real (entrada, conferência, autorização).
- ✅ Resultado imediato: Welliton some da aba "Esperados" e continua corretamente listado no Pátio.

#### 2. Correção do trigger para não duplicar mais (migration)

Atualizar a função `on_carga_fechada` para:

- 🔒 Antes do INSERT da previsão, fazer `SELECT ... FOR UPDATE` ou usar `INSERT ... ON CONFLICT DO NOTHING` baseado num índice único parcial.
- 🆕 Criar **índice único parcial** em `veiculos_esperados (carga_id, data_referencia) WHERE status_autorizacao <> 'recusado'` — garante que só pode existir 1 registro ativo por carga/dia, eliminando a race condition no banco.
- ➕ Ampliar o guard para também pular se já existe walk-in com mesma `placa + data_referencia + status_autorizacao IN ('aguardando_vinculo','aguardando_autorizacao','autorizado')`. Assim, mesmo se a carga ainda não tiver `carga_id` no walk-in, não duplica.
- 🧹 Como bônus, a migration faz cleanup retroativo: deleta linhas `previsto` órfãs que tenham um walk-in conferido com a mesma `carga_id`.

#### 3. (Opcional) Quando a portaria liberar a entrada de um walk-in já vinculado a carga, marcar eventual previsão dessa mesma `carga_id` como `recusado` ou apagar — assim a lista de "Esperados" reflete exatamente o que ainda está pra chegar.

### Detalhes técnicos

**Migration SQL (resumo):**

```sql
-- Cleanup retroativo
DELETE FROM veiculos_esperados v1
WHERE walk_in = false
  AND status_autorizacao = 'previsto'
  AND EXISTS (
    SELECT 1 FROM veiculos_esperados v2
    WHERE v2.carga_id = v1.carga_id
      AND v2.walk_in = true
      AND v2.id <> v1.id
  );

-- Índice único parcial pra impedir race condition
CREATE UNIQUE INDEX IF NOT EXISTS veiculos_esperados_carga_unique_ativo
  ON veiculos_esperados (carga_id, data_referencia)
  WHERE status_autorizacao <> 'recusado' AND carga_id IS NOT NULL;

-- Trigger melhorado: ON CONFLICT + checagem por placa
CREATE OR REPLACE FUNCTION on_carga_fechada() ...
  INSERT INTO veiculos_esperados (...) VALUES (...)
  ON CONFLICT DO NOTHING;
```

### O que NÃO muda

- Movimentações de portaria (entrada do Welliton no pátio) ficam intactas.
- Walk-in conferido continua exatamente como está — só remove a duplicata "previsto".
- Sem mexer em código de UI; é só migration + DELETE pontual.
- Outras cargas/veículos não são afetados pelo cleanup (filtro só pega duplicatas com walk-in vinculado).

