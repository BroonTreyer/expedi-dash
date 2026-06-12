## Aumentar fontes pequenas nas telas de Portaria

### Objetivo
Aumentar a legibilidade dos textos finos (badges, células de tabela, labels, descrições) em todas as telas da seção Portaria, sem afetar outras áreas do sistema.

### Problema identificado
Os componentes de portaria usam excessivamente tamanhos pequenos:
- `text-[10px]` em badges e legendas (muito fino para leitura em campo)
- `text-[11px]` em cabeçalhos de tabela e subtítulos
- `text-xs` em cards mobile, células de tabela e labels

### Solução: Escopo CSS via wrapper de página
Em vez de editar componente por componente (20+ arquivos), aplicar um **wrapper com classe única** nas 6 páginas de portaria e sobrescrever os tamanhos pequenos via CSS global no `index.css`.

#### 1. Wrapper nas páginas
Adicionar `data-portaria="true"` no `<div>` container principal de cada página:
- `src/pages/Portaria.tsx`
- `src/pages/PortariaTerceirizado.tsx`
- `src/pages/PortariaCargaPropria.tsx`
- `src/pages/PortariaAdmin.tsx`
- `src/pages/PortariaManual.tsx`
- `src/pages/RegistroEntrada.tsx`

#### 2. Regras CSS no `index.css`
Adicionar ao `@layer base` ou `@layer utilities`:

```css
/* Aumenta textos pequenos apenas nas telas de Portaria */
[data-portaria="true"] .text-\[10px\],
[data-portaria="true"] [class*="text-[10px]"] {
  font-size: 0.75rem !important; /* 12px, equivale a text-xs */
}

[data-portaria="true"] .text-\[11px\],
[data-portaria="true"] [class*="text-[11px]"] {
  font-size: 0.8125rem !important; /* 13px */
}

[data-portaria="true"] .text-xs {
  font-size: 0.875rem !important; /* 14px, equivale a text-sm */
}
```

**O que muda:**
- Badges de 10px → 12px
- Cabeçalhos de tabela de 11px → 13px
- Textos de cards e células de 12px → 14px
- `text-sm` (14px) e superiores **permanecem inalterados** para evitar quebra de layout

#### 3. Verificação
Testar visualmente no preview as abas:
- Pátio Atual (cards e tabela)
- Histórico (tabela e paginação)
- Cargas fechadas aguardando
- Veículos esperados
- Painel administrativo

### Por que não editar cada componente?
São mais de 20 componentes compartilhados entre portaria e outras áreas (ex.: dialogs de registro). Editar um por um aumentaria o risco de efeito colateral em telas fora de portaria. O wrapper CSS é cirúrgico e facilmente reversível.

### Escopo limitado
- Não altera cores, espaçamentos, botões ou títulos grandes (`text-sm` para cima).
- Não afeta componentes reutilizados fora do contexto de portaria.