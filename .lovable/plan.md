# Ajuste de layout — card de Pré-carga com muitas cidades

## Diagnóstico

No card de pré-carga (`src/pages/PreCargas.tsx`, função `PreCargaCard`), o cabeçalho usa um `flex flex-wrap justify-between` com:

- **Coluna esquerda** (`min-w-0`): título + badges + linha com tipo de caminhão, placa/motorista/transportadora **e a lista de destinos** (cidades separadas por vírgula).
- **Coluna direita** (`shrink-0`): "Peso total", kg embarcados e botões PDF/Excel.

Quando a lista de destinos é curta (CEARA SANTA INES, MATEUS CARGA 5) cabe tudo na esquerda e a coluna direita fica alinhada no topo à direita.

Na EDIVAR ROTA são 10+ cidades. A string de destinos ocupa a linha inteira, a coluna esquerda fica larga demais e o bloco "Peso total / PDF / Excel" **quebra para baixo**, ficando desalinhado e parecendo "quebrado".

## Solução

Tirar a linha de destinos de dentro do bloco do cabeçalho e renderizá-la como uma **faixa separada logo abaixo do header**, ocupando a largura total do card. Assim:

- O bloco "Peso total + PDF + Excel" fica sempre ancorado no topo à direita, em todos os cards.
- A lista de cidades quebra naturalmente em quantas linhas precisar, sem empurrar nada.
- Visualmente fica uma "barrinha" de destinos consistente entre cards com 2 ou 20 cidades.

### Mudanças em `src/pages/PreCargas.tsx` → `PreCargaCard`

1. **Remover** o `<span>` de `carga.destinos` da linha de metadados dentro do `<CardHeader>` (linha ~327).
2. **Adicionar** logo após o `<CardHeader>` (antes do `<CardContent>`) um bloco novo, só quando houver `carga.destinos`:
   - Container com padding horizontal igual ao do card (`px-4 py-2`), borda superior sutil (`border-t border-border/50`) e fundo levemente diferenciado (`bg-muted/30`) para criar separação visual.
   - Ícone `MapPin` à esquerda + texto das cidades com `flex-wrap` natural (quebra por palavra/vírgula).
   - Tipografia: `text-xs text-muted-foreground` (mantém o estilo atual).
   - `leading-relaxed` para respiro quando quebra em várias linhas.

### Resultado esperado

```text
┌──────────────────────────────────────────────────────────────┐
│ 📦 EDIVAR ROTA  [21/05/2026] [11 pedidos] [1 ruptura·504kg] │
│ 🚚 Carreta · 👤 OAW4J70 · FERNANDO ...      Peso total      │
│                                              36.679,6 kg     │
│                                              36.175,6 embarc.│
│                                              [PDF] [Excel]   │
├──────────────────────────────────────────────────────────────┤
│ 📍 Salvador/BA, Remanso/BA, Candeias/BA, Capim Grosso/BA,    │
│    Feira de Santana/BA, Serrinha/BA, Lauro de Freitas/BA,    │
│    SIMOES FILHOS/BA, Jequié/BA, ITAGI/BA                     │
├──────────────────────────────────────────────────────────────┤
│ ▾ Pedidos e rupturas                                         │
└──────────────────────────────────────────────────────────────┘
```

Cards com poucas cidades ganham a mesma faixa (1 linha só) — fica padronizado.

## Escopo

- 1 arquivo: `src/pages/PreCargas.tsx`
- Sem mudanças de lógica, dados ou outros componentes.
