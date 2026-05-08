## Problema
No aviso âmbar "Sem cadastro financeiro" da aba **Adiantamentos → Montar Lote**, eu coloquei o link `/cadastros?tab=transportadoras`, que não existe. A página `/cadastros` só tem Motorista, Caminhão e Tipo de caminhão.

O cadastro financeiro de transportadoras (Nome, Código, CNPJ, PIX, Banco, % padrão) já está implementado e funcional em **`/transportadoras`** (`src/pages/Transportadoras.tsx`).

## Correção

### `src/components/logistica/AdiantamentosTab.tsx`
- Trocar o `href` do link "Cadastrar" de `/cadastros?tab=transportadoras` para **`/transportadoras`**.

Só isso. Nenhuma mudança de schema, hook ou outra página.

## Fora de escopo
- Não vou duplicar o cadastro dentro de `/cadastros`. A página dedicada `/transportadoras` já cumpre esse papel.
