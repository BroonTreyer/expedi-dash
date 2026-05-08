## Adicionar aba "Transportadoras" em /cadastros

Hoje a página `/cadastros` é um formulário único (Motorista + Caminhão + Tipo). Vamos reorganizá-la em **abas** e incluir uma aba dedicada a **Transportadoras**, reutilizando o CRUD que já existe na página `/transportadoras`.

### Estrutura nova de `/cadastros`

Tabs (componente `Tabs` do shadcn):
1. **Cadastro Unificado** — formulário atual (Motorista + Caminhão + Tipo), sem alterações de lógica.
2. **Transportadoras** — lista + criar/editar/excluir transportadora financeira.
3. O modo `?focus=buscar` continua funcionando: abre direto na aba "Cadastro Unificado" com o card de busca por cima (sem mudança de comportamento).

### Aba Transportadoras

Reaproveita os hooks já existentes:
- `useTransportadorasFinanceiro` (listar)
- `useUpsertTransportadoraFin` (criar/editar)
- `useDeleteTransportadoraFin` (excluir)

UI igual à de `src/pages/Transportadoras.tsx`:
- Tabela com Nome, Código, CNPJ, PIX, % Adt. padrão, Status, ações (editar/excluir).
- Botão "Nova" abre `Dialog` com os mesmos campos (nome, código, CNPJ, PIX + tipo, banco/ag/conta, % adiantamento, ativa).

### Refatoração

Para evitar duplicação:
- Extrair o conteúdo da página `Transportadoras.tsx` para um componente reutilizável **`src/components/cadastros/TransportadorasTab.tsx`**.
- `src/pages/Transportadoras.tsx` passa a renderizar esse componente dentro do `Layout` (mantém a rota `/transportadoras` funcionando para quem acessa direto).
- `src/pages/Cadastros.tsx` importa `TransportadorasTab` e renderiza dentro da nova aba.

### Arquivos afetados

- **Novo:** `src/components/cadastros/TransportadorasTab.tsx` (extração do CRUD atual de Transportadoras, sem `<Layout>` nem `<h1>`).
- **Editado:** `src/pages/Cadastros.tsx` — envolver o conteúdo em `<Tabs>` com duas abas e incluir a nova aba.
- **Editado:** `src/pages/Transportadoras.tsx` — passa a usar o novo componente extraído.

Sem alterações de banco, RLS ou edge functions.