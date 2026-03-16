

# Gerar PDF da Carga após Fechar

## O que será feito

Criar um componente de impressão/PDF que é exibido após o fechamento da carga, com o layout da Frico, contendo todos os dados da carga organizada por ordem de entrega.

## Abordagem

Usar `window.print()` com um componente de layout dedicado para impressão — sem dependências externas. O fluxo será:

1. Após clicar "Fechar Carga" e salvar, abrir um **dialog de impressão** com o resumo da carga
2. O usuário clica "Imprimir / PDF" → abre `window.print()` (o navegador permite salvar como PDF nativamente)

## Layout do PDF

```text
┌─────────────────────────────────────────┐
│  [Logo Frico]   ROMANEIO DE CARGA       │
│                                         │
│  Carga: CG-20260316-2052                │
│  Data: 16/03/2026                       │
│  Caminhão: Truck XL  |  Placa: ABC1D23  │
│  Motorista: João Silva                  │
│  Horário Previsto: 08:00                │
├─────────────────────────────────────────┤
│  1. CLI001 – Supermercado João          │
│     Produto A .......... 500 kg         │
│     Produto B .......... 300 kg         │
│     Subtotal: 800 kg                    │
│                                         │
│  2. CLI002 – Mercearia Maria            │
│     Produto C .......... 200 kg         │
│     Subtotal: 200 kg                    │
├─────────────────────────────────────────┤
│  TOTAL: 3 pedidos · 1.000 kg            │
└─────────────────────────────────────────┘
```

## Arquivos

### Novo: `src/components/dashboard/CargaPrintDialog.tsx`
- Dialog com visualização do romaneio formatado para impressão
- Usa o logo da Frico (`src/assets/frico-logo.png`)
- CSS `@media print` para esconder tudo exceto o conteúdo do romaneio
- Botões: "Imprimir / PDF" e "Fechar"

### Editar: `src/components/dashboard/FechamentoLoteDialog.tsx`
- Após `handleSubmit`, ao invés de fechar o dialog, passar os dados da carga para abrir o `CargaPrintDialog`

### Editar: `src/pages/Index.tsx`
- Adicionar estado e renderização do `CargaPrintDialog`
- Receber os dados da carga fechada do `FechamentoLoteDialog` via callback

### Editar: `src/index.css`
- Adicionar regras `@media print` globais para ocultar sidebar, header etc.

Nenhuma mudança no banco de dados.

