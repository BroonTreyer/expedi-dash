
## Diagnóstico

User confirma exatamente o fluxo já implementado:
1. Portaria registra entrada (Reg. Entrada) → `veiculos_esperados` walk-in com status `aguardando_vinculo`
2. Logística vincula carga → status vira `autorizado` (= "OK da Logística")
3. Portaria vê o card como "LIBERADO" e clica em "Liberar Entrada" → cria movimentação e veículo vai pro pátio

Isso já está funcionando após as últimas mudanças. O ajuste solicitado parece ser **tornar o fluxo mais explícito visualmente**: deixar claro que a Logística deu o "OK" antes da Portaria poder liberar.

## Plano

### 1. `SolicitacoesPendentesPanel.tsx` — reforçar o sinal visual do "OK"
No card do grupo "Liberados — aguardando liberação de entrada":
- Adicionar badge verde **"✓ OK Logística"** com nome de quem autorizou (se disponível em `autorizado_por`) e horário (`autorizado_em` formatado).
- Mostrar o `carga_id` vinculado em destaque com ícone `Package`.
- Trocar o título do botão por **"Liberar Entrada no Pátio"** (mais explícito) e manter ícone `LogIn`.
- Adicionar microcopy abaixo do botão: *"Logística autorizou — confirme entrada física do veículo"*.

No card do grupo "Aguardando vínculo da Logística":
- Adicionar microcopy: *"Aguardando Logística vincular carga para liberar entrada"*.
- Desabilitar qualquer ação direta de liberação (apenas Logística pode vincular).

### 2. `useVeiculosEsperados.ts` — buscar nome do autorizador
- No `useVeiculosAguardandoVinculo`, fazer join leve para trazer email/nome do `autorizado_por` via `profiles` (subquery em paralelo).
- Retornar campos extras `autorizadoPorNome` e `autorizadoEm` no payload.

### 3. Sem outras mudanças
Backend, schema, RLS, fluxo de Pátio, fluxo de saída — tudo permanece. Apenas reforço visual do "OK" da Logística no card.

## Arquivos
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` (badge OK Logística, microcopy, label do botão)
- ✏️ `src/hooks/useVeiculosEsperados.ts` (incluir `autorizado_por` resolvido via profiles)
