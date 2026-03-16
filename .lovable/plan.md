

# Scrollbar horizontal sempre visível na tabela

## Problema
A tabela tem muitas colunas e o scroll horizontal só aparece lá embaixo, fora da área visível — especialmente quando a tela está dividida ao meio.

## Solução
Fazer o container da tabela ocupar o espaço restante da viewport (altura fixa calculada), para que o scrollbar horizontal fique **sempre visível** na parte inferior da área visível, sem precisar rolar até o fim da página.

## Mudanças

### `src/components/dashboard/CarregamentoTable.tsx`
- No wrapper `<div className="rounded-lg border ... overflow-x-auto">`, adicionar `overflow-y: auto` e `max-height` via classe utilitária (ex: `max-h-[calc(100vh-320px)]`) para que a tabela role internamente e o scrollbar horizontal fique sempre acessível
- Adicionar `sticky top-0 z-10 bg-card` no `<TableHeader>` para que o cabeçalho fique fixo ao rolar verticalmente

### `src/pages/Index.tsx`
- Nenhuma mudança estrutural necessária — o container pai já tem `overflow-auto` no `<main>`

## Resultado
- Scrollbar horizontal sempre visível na base da tabela (dentro do viewport)
- Cabeçalho fixo ao rolar verticalmente
- Funciona bem em tela dividida (~520px de largura)

