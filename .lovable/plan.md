

## Problema

O painel "Veículos Esperados" usa uma tabela com 8 colunas que fica ilegível no mobile (390px). Precisa de layout responsivo em cards para telas pequenas.

## Solução

Converter `VeiculosEsperadosPanel.tsx` para usar **cards empilhados no mobile/tablet** e manter a tabela apenas no desktop (md+), seguindo o padrão de responsividade do projeto.

### Layout Mobile (< 768px) — Cards

Cada veículo vira um card compacto:
```text
┌─────────────────────────────┐
│ 🚛 ABC1D23        Pendente  │
│ Motorista: João Silva       │
│ Rota: INTERIOR  |  Carga: 5 │
│ Peso: 1.200  |  Entregas: 8 │
│ [  Registrar Entrada      ] │
└─────────────────────────────┘
```
- Placa em destaque (font-mono, bold)
- Badge de status (pendente/conferido)
- Dados em grid 2 colunas
- Botão full-width
- Conferidos: opacity-50, check verde, sem botão

### Layout Desktop (≥ 768px) — Tabela atual

Mantém a tabela existente sem alterações.

### Arquivo

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Adicionar renderização condicional: cards no mobile (`md:hidden`), tabela no desktop (`hidden md:block`). Scroll vertical com `max-h-[300px]` nos cards |

