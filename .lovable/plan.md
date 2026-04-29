
## Objetivo

Transformar `/expedicao` em um painel de monitoramento de alto contraste, com cores vivas, leitura fácil em monitor/TV, métricas de peso (kg) carregado, a carregar e total, e movê-lo para o nível raiz do menu (fora de "Portaria").

## 1. Reposicionar o item de menu

Em `src/components/AppSidebar.tsx`:

- **Remover** `Visão Expedição` de dentro do grupo `Portaria` (linha 55).
- **Adicionar** como item raiz, logo após `Painel` (linha 36), com ícone `Monitor` e papéis `admin`, `logistica`, `portaria`:

```ts
{ to: "/expedicao", label: "Expedição", icon: Monitor, roles: ["admin", "logistica", "portaria"] }
```

Rótulo enxuto: "Expedição" (não "Visão Expedição").

## 2. Novos KPIs com peso (kg)

Substituir `ExpedicaoKpiCards` por uma faixa de **6 cards** divididos em duas linhas conceituais:

**Linha 1 — Operação (contagem de veículos):**
- No pátio
- Chegou — aguardando
- A chegar
- Cargas prontas

**Linha 2 — Peso (kg) do dia:**
- **Carregado / em carregamento** = soma de `peso` das movimentações `entrada` com `horario_entrada` (terceirizado, do dia)
- **A carregar** = soma de `peso_total` das `cargasTerc` (cargas fechadas aguardando) + soma de `peso` dos `veiculosEsperados` ainda não conferidos
- **Total previsto do dia** = Carregado + A carregar

Layout: grid de 2 colunas no mobile, 4 no `md`, 6 no `xl`. Números grandes (`text-3xl xl:text-4xl`), formatados em pt-BR com sufixo "kg" e separador de milhar.

## 3. Redesign visual (alto contraste, cores vivas)

Padrão de cor por painel (mantém semântica, mas cheio em vez de transparente):

| Painel              | Cor           | Header                                  | Borda     |
|---------------------|---------------|-----------------------------------------|-----------|
| No Pátio            | Verde esmeralda | `bg-emerald-600 text-white`           | `border-emerald-600` |
| Chegou — aguardando | Âmbar         | `bg-amber-500 text-black`               | `border-amber-500`   |
| A chegar            | Azul céu      | `bg-sky-600 text-white`                 | `border-sky-600`     |
| Cargas prontas      | Índigo        | `bg-indigo-600 text-white`              | `border-indigo-600`  |

Mudanças nos cards de cada item da lista:
- Fundo `bg-card` substituído por `bg-background` com **borda esquerda colorida espessa** (`border-l-4` na cor do painel).
- Placa em `font-mono font-extrabold text-base sm:text-lg` (em vez de `text-sm`).
- Aumentar `text-xs` para `text-sm` em informações secundárias.
- Badge de tempo no canto direito em pílula sólida colorida (verde/âmbar/vermelho) em vez de só texto colorido.
- Linhas alternadas (zebra) com `even:bg-muted/40` para facilitar leitura.

Indicadores de tempo (No Pátio):
- `< 4h`: pílula verde sólida
- `4h–8h`: pílula âmbar sólida
- `≥ 8h`: pílula vermelha sólida pulsante (`animate-pulse`) + ícone `AlertTriangle`

Cabeçalho da página: aumentar título para `text-2xl md:text-3xl`, adicionar relógio grande ao lado direito (HH:mm:ss atualizando a cada 30s já existente) para reforço visual de "ao vivo".

## 4. Mostrar kg em cada item da lista

- **No Pátio** e **Chegou**: adicionar badge com `m.peso` formatado em kg quando presente.
- **A chegar**: já mostra peso — promover para badge colorido em destaque.
- **Cargas prontas**: já mostra `peso_total` — destacar como badge índigo grande.

## 5. KPI de peso — fórmula

```ts
const kgCarregado = movimentacoes
  .filter(m => m.tipo_movimento === "entrada" && m.horario_entrada)
  .reduce((s, m) => s + (Number(m.peso) || 0), 0);

const kgCargasFechadas = cargasTerc
  .reduce((s, c) => s + (Number(c.peso_total) || 0), 0);

const kgEsperados = veiculosEsperados
  .filter(v => !v.conferido)
  .reduce((s, v) => s + (Number(v.peso) || 0), 0);

const kgACarregar = kgCargasFechadas + kgEsperados;
const kgTotal = kgCarregado + kgACarregar;
```

## Arquivos afetados

- `src/components/AppSidebar.tsx` — reposicionar item de menu.
- `src/pages/Expedicao.tsx` — calcular KPIs de peso, passar ao `ExpedicaoKpiCards`, ajustar título.
- `src/components/expedicao/ExpedicaoKpiCards.tsx` — adicionar 3 cards de peso, novo layout 6-col.
- `src/components/expedicao/PainelNoPatio.tsx` — header sólido, borda esquerda colorida, pílulas de tempo, badge de peso, zebra.
- `src/components/expedicao/PainelChegou.tsx` — mesmo padrão (âmbar) + badge de peso.
- `src/components/expedicao/PainelAChegar.tsx` — mesmo padrão (sky) + peso destacado.
- `src/components/expedicao/PainelCargasFechadas.tsx` — mesmo padrão (indigo) + peso destacado.

Sem mudanças de banco, sem novas hooks, sem novas dependências.
