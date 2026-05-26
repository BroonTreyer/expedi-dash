## Bug: "Registrar chegada" mandando Distribuidor direto pro pátio (e duplicando)

Quando a portaria clica em **Registrar chegada do veículo** numa carga fechada de Distribuidor (Terceirizado), o sistema:

1. Joga o veículo direto para "No Pátio" (pula a etapa "Aguardando liberação").
2. Marca `veiculos_esperados.conferido = true` na hora.
3. Gera duplicidade no Pátio Atual (o mesmo registro aparece como se tivesse passado pelos dois passos).

Isso contradiz o fluxo documentado em `mem/features/portaria-third-party-workflow.md`:

```text
1. Registrar chegada  → horario_chegada=now, horario_entrada=NULL, etapa='chegada'
2. Liberar entrada    → UPDATE horario_entrada=now, etapa='no_patio', conferido=true
```

### Causa raiz

`src/components/portaria/RegistroEntradaDialog.tsx`, função `handleSubmitVinculadoACarga`, no ramo Terceirizado:

```ts
movPayload = {
  ...
  etapa_terceirizado: "no_patio",   // ← deveria ser "chegada"
  horario_entrada: nowIso,          // ← deveria ser null
  horario_chegada: nowIso,
  ...
};
```

E logo abaixo, mesmo no caso Terceirizado, ele já dispara:

```ts
await supabase.from("veiculos_esperados")
  .update({ conferido: true, ... })   // ← só deveria acontecer na liberação
```

Comentário "Fluxo de 1 passo" e o toast "veículo no pátio" reforçam que alguém colapsou os dois passos por engano.

### Correção (escopo só do Terceirizado)

No mesmo arquivo, alterar apenas o ramo `else` (TERCEIRIZADO) da função `handleSubmitVinculadoACarga`:

1. **Payload da chegada** vira estado intermediário:
   ```ts
   movPayload = {
     tipo_movimento: "entrada",
     categoria: "terceirizado",
     placa: placaNorm,
     motorista: motoristaNorm,
     tipo_caminhao: tipoVeiculo,
     carga_id: cargaId,
     empresa: transportadora,
     etapa_terceirizado: "chegada",
     horario_chegada: nowIso,
     horario_entrada: null,
     data_hora: nowIso,
     usuario_id: user?.id ?? null,
   };
   ```

2. **Não tocar em `veiculos_esperados.conferido` no Terceirizado** — só atualizar `status_autorizacao/autorizado_por/autorizado_em/carga_id`. A marcação `conferido=true` continua acontecendo só no `liberarEntrada` do `CargasFechadasAguardandoPanel.tsx` (já implementado corretamente).

3. **Toast** vira:
   ```
   "Chegada registrada — aguardando liberação no pátio"
   description: "Próximo passo: clique em 'Liberar entrada no pátio' quando o caminhão entrar."
   ```

4. **Dedup**: manter a lógica de reaproveitar `pendentes` com `horario_entrada IS NULL` (continua válida — agora o novo registro também fica com `horario_entrada NULL`, então não vai gerar duplicata se a portaria clicar de novo).

5. **Carga Própria (Varejo)** continua igual (entra direto no pátio por desenho — confere com o `buildCargaPropriaPayload`).

### Efeito visual esperado

- Após "Registrar chegada", a carga passa a aparecer no `CargasFechadasAguardandoPanel` com badge âmbar "Aguardando liberação" e os botões "Desfazer chegada" / "Liberar entrada no pátio" (lockout de 30s).
- O Pátio Atual só recebe o veículo depois do clique em "Liberar entrada no pátio".
- Sem duplicação: existe um único `movimentacoes_portaria` que evolui via UPDATE.

### Limpeza de dados (a confirmar com você)

O registro atual do LUCAS BORGES (OZR0D10, MOREIRA, 15:50) está com `horario_entrada` preenchido erradamente. Posso, junto com a correção do código:

- Reverter esse movimento para `etapa_terceirizado='chegada'`, `horario_entrada=NULL` (mantendo `horario_chegada=15:50`), e
- Setar `veiculos_esperados.conferido=false` para a carga correspondente,

para ele voltar para "Aguardando liberação" como deveria ter ficado. Me confirma se quer que eu inclua essa limpeza.

### Arquivos afetados

- `src/components/portaria/RegistroEntradaDialog.tsx` (único arquivo de código)
- Opcional: UPDATE em `movimentacoes_portaria` + `veiculos_esperados` para o registro do LUCAS.
