

## 1. Foto do Lacre aparece sempre nos detalhes do Terceirizado

### O que muda

Hoje em `MovimentoDetailsDialog.tsx`, quando o terceirizado é finalizado, a foto do lacre é gravada no registro de **saída** (vinculado por `movimento_vinculado_id`). A renderização em tela depende de o pareamento entrada↔saída ter sido feito corretamente — quando o usuário abre os detalhes pelo histórico ou por um card que só carrega uma das pontas, a foto pode não aparecer (ou só aparecer rotulada errada).

### Solução

Tornar a renderização de fotos do terceirizado **defensiva**, garantindo que `foto_lacre_url` seja exibida vindo de qualquer um dos registros disponíveis (entrada `m`, saída `sDistinct`, ou da própria saída quando ela é o registro principal). Hoje existe um caminho onde, se `m` for a saída e `sDistinct` for indefinido, a label vai como "(Entrada)" — vamos detectar via `m.tipo_movimento` qual rótulo aplicar e nunca esconder a imagem.

### Mudanças concretas

- ✏️ `src/components/portaria/MovimentoDetailsDialog.tsx` (branch `else` do bloco `allPhotos`, linhas ~139–150):
  - Calcular `tipoLabel = m.tipo_movimento === "saida" ? "Saída" : "Entrada"` e aplicá-lo nas labels que usam `m`.
  - Para `foto_lacre_url`: além de empurrar de `m` e `sDistinct`, verificar também `s` (mesmo quando `isSameRecord`) — usar um `Set<string>` de URLs já adicionadas pra evitar duplicata.
  - Resultado: a foto do lacre passa a aparecer em qualquer combinação (entrada+saída, só entrada, só saída).

## 2. Saída do Terceirizado atualiza Consolidado para "Carregado"

### O que muda

Hoje, ao registrar a saída final (com lacre) de um terceirizado em `RegistroMovimentoDialog.tsx` (linhas 379–385), o sistema apenas marca `etapa_terceirizado="finalizado"` e `horario_real_saida`. O status da carga em `carregamentos_dia` continua no que estava (geralmente "Aguardando" ou "Carregando"), e a página **Consolidado** mostra o status antigo.

### Solução

Após a saída do terceirizado, se a entrada tinha `carga_id` vinculada, atualizar `carregamentos_dia.status = 'Carregado'` para todos os pedidos daquela `carga_id`. Reaproveita o canal Realtime já existente em `Consolidado.tsx` (subscribe em `carregamentos_dia`), então a UI atualiza automaticamente sem refresh.

### Mudanças concretas

- ✏️ `src/components/portaria/RegistroMovimentoDialog.tsx` (logo após o `updateMov.mutateAsync` da linha 380, dentro do `if (prefill && prefill.categoria === "terceirizado" && dbTipoMovimento === "saida")`):
  - Capturar `cargaIdVinculada = prefill.carga_id`.
  - Se existir, chamar:
    ```ts
    await supabase
      .from("carregamentos_dia")
      .update({ status: "Carregado" })
      .eq("carga_id", cargaIdVinculada)
      .neq("status", "Carregado"); // evita update redundante / loops audit
    ```
  - Em caso de erro, apenas `console.error` (não bloquear o fluxo de saída — a saída em si já foi gravada).
  - Toast de sucesso já existente do `createMov` cobre o feedback principal; opcional adicionar `toast.info("Carga marcada como Carregado")` se `cargaIdVinculada` for truthy.

### O que NÃO muda

- Sem migration. Sem novo trigger no banco — feito no client porque já temos contexto do `prefill.carga_id`.
- `Consolidado.tsx` não muda — o realtime já invalida a query ao detectar UPDATE em `carregamentos_dia`.
- Carga própria continua com seu fluxo próprio (Chegou → Em Rota → Retornou → Saída Final/Lacre); só Terceirizado ganha esse comportamento de "Carregado" na saída.
- Se a entrada do terceirizado **não** tiver `carga_id` (entrou sem vínculo), nada é atualizado — comportamento correto.

