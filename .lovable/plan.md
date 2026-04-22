

## Romaneio com duas ordens: Entrega e Carregamento

### O racional

Você tem razão — o botão "Inverter ordem" era um workaround. O que importa de verdade é o **romaneio impresso** mostrar as duas ordens lado a lado, porque:

- **Ordem de entrega** = sequência da rota (1º cliente que recebe, 2º, 3º…)
- **Ordem de carregamento** = inverso da entrega (o último a entregar entra primeiro no caminhão, fica no fundo; o primeiro a entregar entra por último, fica na porta)

Hoje o romaneio (`CargaPrintDialog.tsx`) mostra só a ordem de entrega (`group.ordem`). O conferente do armazém precisa carregar de trás pra frente mentalmente — fonte de erro.

### Solução

Mostrar as duas ordens em cada cliente do romaneio, sem botão nenhum:

```
[E:1 / C:5]  CLIENTE ATACADÃO ZONA SUL                   1.240 kg
[E:2 / C:4]  MERCADO BOM PREÇO                              890 kg
[E:3 / C:3]  PADARIA SÃO JOÃO                               560 kg
[E:4 / C:2]  CONVENIÊNCIA 24H                               320 kg
[E:5 / C:1]  RESTAURANTE SABOR                              180 kg  ← PRIMEIRO A CARREGAR
```

Onde `E` = ordem de Entrega (a que já existe) e `C` = ordem de Carregamento = `total - ordem + 1`.

### Mudanças concretas

- ✏️ `src/components/dashboard/CargaPrintDialog.tsx`:
  - No header de cada `group`, substituir `{group.ordem}.` por dois badges/labels: **`E:{group.ordem}`** (ordem de entrega) e **`C:{totalGrupos - group.ordem + 1}`** (ordem de carregamento).
  - Adicionar pequena legenda no topo do romaneio, logo abaixo do bloco de info: *"E = ordem de entrega · C = ordem de carregamento (sequência inversa para empilhar no caminhão)"*.
  - Ordenar os grupos por **ordem de carregamento decrescente OU manter por entrega** — recomendo **manter por entrega** (já é o atual), porque é a referência do motorista na rota; o conferente lê a coluna `C` pra montar a pilha.

- ✏️ Opcional, mesma lógica em `EditarCargaDialog.tsx` (lista de pedidos): adicionar badge `C:` ao lado do `#{ordem_entrega}` já existente, pra dar visibilidade da ordem de carregamento também na edição.

### O que NÃO muda

- Sem mexer no banco — `ordem_entrega` continua sendo a única coluna; carregamento é cálculo derivado.
- Sem botão "Inverter ordem" novo no fluxo de fechar carga (o que você já tem em `EditarCargaDialog` continua, pra casos excepcionais de inverter a rota inteira).
- Roteirização, fechamento, KPIs e portaria intactos.

### Pergunta única

A ordem de carregamento é **sempre** o inverso exato da entrega (último a entregar = primeiro a carregar)? Ou existe algum caso (ex.: produto pesado/refrigerado) em que a regra é diferente? Confirmando que é inverso puro, parto pra implementação.

