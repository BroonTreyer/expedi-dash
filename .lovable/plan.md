## Bug confirmado

O motorista **FLENDSON RODRIGUES DE MEDEIROS** (placa MXE9B40, TREVINHO) registrou chegada hoje às 19:33 como `terceirizado / etapa_terceirizado=chegada`, **sem `carga_id` e sem `horario_entrada`**.

Confirmei via DB que o movimento existe (`6ff03e6e-d469-4c87-9d64-3ec14ead09f8`), mas ele **não aparece em nenhum painel** da tela `/portaria/terceirizado`:

| Painel | Por que não mostra |
|---|---|
| `PatioAtualTab` | `PatioAtualTab.tsx:135-139` exclui explicitamente `terceirizado + chegada + !carga_id` |
| `CargasFechadasAguardandoPanel` | Só lista cargas já fechadas no dashboard — não há carga vinculada |
| `SolicitacoesPendentesPanel` | Lê de `veiculos_esperados` (walk-in). Como a chegada foi feita pelo diálogo de Registro, **nenhum `veiculos_esperados` foi criado** |

Antes (suspeita): o card aparecia em vermelho no `PatioAtualTab` como "Aguardando vínculo". Em algum momento o filtro das linhas 131-139 foi adicionado para mover esses casos para um "painel laranja" — mas esse painel **nunca foi criado**, então o registro virou fantasma.

## Correção

**Reexibir movimentos `terceirizado + chegada + sem carga_id` no Pátio Atual com destaque vermelho e ação para vincular carga.**

### Arquivo: `src/components/portaria/PatioAtualTab.tsx`

1. **Remover** o filtro das linhas 131-139 (que escondia esses registros).
2. Adicionar helper `isAguardandoVinculoCarga(m)`:
   ```ts
   m.categoria === "terceirizado" &&
   m.etapa_terceirizado === "chegada" &&
   !m.carga_id
   ```
3. Quando `isAguardandoVinculoCarga(m)` for `true`:
   - Card mobile: borda/fundo vermelho (`border-destructive/50 bg-destructive/5`) — mesma intensidade dos cards de >8h.
   - Badge: `"Aguardando vínculo"` (vermelho, com ícone `AlertTriangle`).
   - Substituir botão "Liberar entrada" por **"Vincular carga"** abrindo o `VincularMovimentoCargaDialog` já existente (`src/components/portaria/VincularMovimentoCargaDialog.tsx`).
   - Manter botão "Desfazer chegada" (DELETE permitido enquanto `horario_entrada IS NULL`) para admin/logística.

### Arquivo: `src/pages/Portaria.tsx`

Atualizar o cálculo `counts.patio` (linhas 117-123) para **não excluir** mais esses registros — a contagem do badge da aba "Pátio" precisa contemplá-los novamente.

### Memória

Atualizar `mem://features/portaria-third-party-workflow.md`: chegada terceirizada sem carga vinculada **permanece visível no Pátio Atual** em estado vermelho "Aguardando vínculo", com ação de vincular carga ou desfazer chegada — não há painel separado.

## Resultado esperado

O card do FLENDSON volta a aparecer no Pátio Atual em vermelho, com ação clara para a Logística vincular a carga (ou desfazer a chegada se o caminhão saiu).