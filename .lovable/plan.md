# Por que a tag "RUPTURA" continua aparecendo

## Diagnóstico (causa real, confirmada no banco)

Olhei o pedido **33 / cliente 10219 (JR DISTRIBUIDORA)** direto no banco. Os 5 produtos estão assim:

| Produto | peso | peso_original | ruptura | ruptura_sinalizada |
|---|---|---|---|---|
| 501 LINGUIÇA TOSCANA | 10000 | 10000 | false | **false** |
| 1100 CARNE MOÍDA | 4000 | **10000** | false | **true** ⚠️ |
| 600 LING SUÍNA | 5000 | **10000** | false | **true** ⚠️ |
| 1100 CARNE MOÍDA | 1000 | **10000** | false | **true** ⚠️ |
| 730 CALABRESA | 10000 | 10000 | false | false |

Ou seja: **na tela de edição** o checkbox "Ruptura" está desmarcado em tudo (e é isso que você vê — `ruptura = false`). Mas no card o sistema considera **ruptura parcial** porque `peso (4000) < peso_original (10000)`. A trigger do banco escreve `ruptura_sinalizada = true` toda vez que o peso fica menor que o original, mesmo que o checkbox de ruptura esteja desligado.

E o `peso_original` ficou "preso" em 10.000 kg porque foi o valor da primeira vez em que o produto entrou. Quando você editou o peso para 4.000, 5.000 e 1.000, o sistema entendeu como "abateu peso → ruptura parcial" e acendeu a tag.

## Resumo do problema

A tag RUPTURA tem **dois gatilhos** hoje:
1. Checkbox "Ruptura" marcado (`ruptura = true`) — visível na UI ✅
2. **Ruptura parcial silenciosa**: `peso < peso_original` — invisível na UI ❌

O caso (2) é o que está te confundindo: por dentro o pedido está "limpo", mas o card acusa ruptura porque o peso atual é menor que o registrado na primeira gravação.

# Plano de correção

## 1. Mostrar o motivo da tag dentro do pedido (transparência)

No `CarregamentoDialog` (tela de edição do pedido), em cada linha de produto onde `peso < peso_original`, exibir um aviso discreto ao lado do campo Peso:

```
⚠ Ruptura parcial: original 10.000 kg → atual 4.000 kg
   [Restaurar original]  [Confirmar redução]
```

Assim o usuário vê **por que** a tag está acesa e tem dois caminhos:
- **Restaurar original**: volta `peso = peso_original` e a tag some.
- **Confirmar redução**: aceita que o peso novo é o correto e **redefine `peso_original = peso`**, limpando `ruptura_sinalizada`.

## 2. Corrigir os 3 registros do pedido 33 agora

Rodar um update pontual para limpar a flag fantasma desse pedido específico (e de qualquer outro na mesma situação onde o usuário claramente já reduziu de propósito, sem marcar ruptura):

Estratégia conservadora: **não** mexer em `peso_original` automaticamente. Apenas garantir que ao salvar pelo diálogo, se o usuário clicar "Confirmar redução", o `peso_original` é atualizado para o `peso` atual e `ruptura_sinalizada` vai para `false`.

Para o pedido 33 visto na imagem, vou deixar a decisão na sua mão via o novo botão "Confirmar redução" — não vou alterar o banco em massa sem você ver.

## 3. Ajustar a trigger `preserve_peso_original`

Hoje a trigger acende `ruptura_sinalizada = true` automaticamente sempre que `peso < peso_original`, mesmo em updates onde o usuário **explicitamente** mandou `ruptura_sinalizada: false` no payload.

Mudança: se o `UPDATE` veio com `ruptura_sinalizada` explicitamente definido no payload (diferente do valor antigo) **e** `ruptura = false`, **respeitar** o que o frontend mandou em vez de sobrescrever. Isso permite que o botão "Confirmar redução" funcione.

## 4. Atualizar o hook `useEditarPedidoAprovacao`

Adicionar suporte ao novo fluxo: quando o usuário confirma a redução, o update enviado vira:

```ts
{
  peso: novoPeso,
  peso_original: novoPeso,   // redefine baseline
  peso_manual: true,
  ruptura: false,
  ruptura_sinalizada: false,
}
```

## Arquivos afetados

- `src/components/dashboard/CarregamentoDialog.tsx` — aviso visual de ruptura parcial + 2 botões por linha
- `src/hooks/useEditarPedidoAprovacao.ts` — suportar `peso_original` no payload
- `supabase/migrations/<novo>.sql` — ajuste da trigger `preserve_peso_original` para respeitar `ruptura_sinalizada` explícito do frontend

## Fora do escopo

- **Não** vou alterar dados existentes em massa. A correção é por pedido, via UI.
- **Não** vou remover a lógica de ruptura parcial automática — ela é útil quando a redução é de fato uma ruptura. Só estou dando ao usuário a forma de dizer "essa redução é intencional, não é ruptura".
